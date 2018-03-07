'use strict';

var rootCas = require('ssl-root-cas/latest').create();

rootCas.addFile(__dirname + '/intermediate.pem');


/**
* The Floodgauge data source.
* Poll the specified Floodgauge feed for new data and send it to the reports application.
* @constructor
* @param {Reports} reports An instance of the reports object.
* @param {object} config Floodgauge specific configuration.
*/
var FloodgaugeDataSource = function FloodgaugeDataSource(
	reports,
	config
){

	// Store references to reports and logger
	this.reports = reports;
	this.logger = reports.logger;

	// Copy reports config into our own config
	this.config = reports.config;
	for (var prop in config) {
		if (config.hasOwnProperty(prop)) {
			this.config[prop] = config[prop];
		}
	}

	this.https = require('https');
	this.https.globalAgent.options.ca = rootCas;

	// Set constructor reference (used to print the name of this data source)
	this.constructor = FloodgaugeDataSource;
};

FloodgaugeDataSource.prototype = {

	/**
	* Data source configuration.
	* This contains the reports configuration and the data source specific configuration.
	* @type {object}
	*/
	config: {},

	/**
	* Instance of the reports module that the data source uses to interact with Cognicity Server.
	* @type {Reports}
	*/
	reports: null,

	/**
	* Instance of the Winston logger.
	*/
	logger: null,

	/**
	* Instance of node https.
	*/
	https: null,

	/**
	* Flag signifying if we are currently able to process incoming data immediately.
	* Turned on if the database is temporarily offline so we can cache for a short time.
	* @type {boolean}
	*/
	_cacheMode: false,

	/**
	* Store data if we cannot process immediately, for later processing.
	* @type {Array}
	*/
	_cachedData: [],

	/**
	* Last contribution timestamp that was processed, for each floodgauge.
	* Used to ensure we don't process the same result twice.
	* @type {number}
	*/
	_lastContributionTime: {0:0},

	/**
	* Reference to the polling interval.
	* @type {number}
	*/
	_interval: null,

	/**
	* Polling worker function.
	* Poll the Floodgauge web service and process the results.
	* This method is called repeatedly on a timer.
	*/
	_poll: function(){
		var self = this;

		// Begin processing results
		self._fetchResults();
	},

	/**
	* Fetch and process the results.
	*/
	_fetchResults: function() {
		var self = this;

		self.logger.verbose( 'FloodgaugeDataSource > poll > fetchResults: Loading data');

		var requestURL = self.config.floodgauge.serviceURL;
		var response = "";

		var req = self.https.request( requestURL , function(res) {
			res.setEncoding('utf8');

			res.on('data', function (chunk) {
				response += chunk;
			});

			res.on('end', function() {
				var responseObject;
				var responseCleaned;
				try {
					responseCleaned = response.replace(/("[^"]+")|([a-zA-Z0-9_-]+):/g, '"$2":$1 ').replace(/: "":/g, ':');
					responseObject = JSON.parse(responseCleaned);
				} catch (e) {
					self.logger.error( "FloodgaugeDataSource > poll > fetchResults: Error parsing JSON: " + response );
					return;
				}

				self.logger.debug("FloodgaugeDataSource > poll > fetchResults: fetched data, " + response.length + " bytes");

				if ( !responseObject || responseObject.length === 0 ) {
					// If page has a problem or 0 objects, end
					self.logger.error( "FloodgaugeDataSource > poll > fetchResults: No results found ");
					return;
				} else {
					// Run data processing callback on the result objects
					self.logger.debug("FloodgaugeDataSource > poll > fetchResults: parsed incoming JSON.");
					self._filterResults( responseObject );
				}
			});
		});

		req.on('error', function(error) {
			self.logger.error( "FloodgaugeDataSource > poll > fetchResults: Error fetching data, " + error.message + ", " + error.stack );
		});

		req.end();
	},

	/**
	* Process the passed result objects.
	* Stop processing if we've seen a result before, or if the result is too old.
	* @param {Array} results Array of result objects from the Floodgauge data to process
	*/
	_filterResults: function( results ) {
		var self = this;
		// For each result:
		var result = results.reports.shift();
		while( result ) {
			if ( Date.parse(result.measureDateTime+'+0700') / 1000 <= self._lastContributionTime[result.gaugeId] ) {
				// We've seen this result before, check the next gauge
				self.logger.debug( "FloodgaugeDataSource > poll > processResults: Found already processed result with contribution ID " + result.gaugeId +': ' + result.measureDateTime	 );
			} else if ( Date.parse(result.measureDateTime+'+0700') < new Date().getTime() - self.config.floodgauge.historicalLoadPeriod ) {
				// This result is older than our cutoff, check the next gauge
				self.logger.debug( "FloodgaugeDataSource > poll > processResults: Result " + result.gaugeId +', ' + result.measureDateTime + " older than maximum configured age of " + self.config.floodgauge.historicalLoadPeriod / 1000 + " seconds" );
			} else {
				// Process this result
				self.logger.verbose( "FloodgaugeDataSource > poll > processResults: Processing result " + result.gaugeId +', ' + result.measureDateTime );
				self._lastContributionTime[result.gaugeId] = Date.parse(result.measureDateTime+'+0700')/1000;
				self._processResult( result );
			}
			result = results.reports.shift();
		}
	},

	/**
	* Process a result.
	* This method is called for each new result we fetch from the web service.
	* @param {object} result The result object from the web service
	*/
	_processResult: function( result ) {
		var self = this;

		if ( self._cacheMode ) {
			// Store result for later processing
			self._cachedData.push( result );
		} else {
			// Process result now
			self._saveResult(result);
		}
	},

	/**
	* Save a result to cognicity server.
	* @param {object} result The result object from the web service
	*/
	_saveResult: function( result ) {
		var self = this;

		// Don't allow users from the Gulf of Guinea (indicates no geo available)
		if (result.longitude !== 0 && result.latitude !== 0){
			self._insertGaugeReading(result);
		}
	},

	/**
	* Insert a confirmed report - i.e. has geo coordinates.
	* Store both the floodgauge report and the user hash.
	* @param {floodgaugeReport} floodgaugeReport Floodgauge report object
	*/
	_insertGaugeReading: function( floodgaugeReport ) {
		var self = this;

		// Insert report
		self.reports.dbQuery(
			{
				text: "INSERT INTO " + self.config.floodgauge.pg.table_floodgauge + " " +
				"(gaugeid, measuredatetime, depth, deviceid, reporttype, level, notificationflag, gaugenameid, gaugenameen, gaugenamejp, warninglevel, warningnameid, warningnameen, warningnamejp, observation_comment, the_geom) " +
				"VALUES (" +
				"$1, " +
				"to_timestamp($2), " +
				"$3, " +
				"$4, " +
				"$5, " +
				"$6, " +
				"$7, " +
				"$8, " +
				"$9, " +
				"$10, " +
				"$11, " +
				"$12, " +
				"$13, " +
				"$14, " +
				"$15, " +
				"ST_GeomFromText('POINT(' || $16 || ')',4326)" +
				");",
				values : [
					floodgaugeReport.gaugeId,
					Date.parse(floodgaugeReport.measureDateTime+'+0700')/1000,
					floodgaugeReport.depth,
					floodgaugeReport.deviceId,
					floodgaugeReport.reportType,
					floodgaugeReport.level,
					floodgaugeReport.notificationFlag,
					floodgaugeReport.gaugeNameId,
					floodgaugeReport.gaugeNameEn,
					floodgaugeReport.gaugeNameJp,
					floodgaugeReport.warningLevel,
					floodgaugeReport.warningNameId,
					floodgaugeReport.warningNameEn,
					floodgaugeReport.warningNameJp,
					floodgaugeReport.comment,
					floodgaugeReport.longitude + " " + floodgaugeReport.latitude
				]
			},
			function ( result ) {
				self.logger.info('Logged confirmed floodgauge report');
			}
		);
	},

	/**
	* Get the last contribution ID as stored in the database.
	* Update _lastContributionTime
	*/
	_updateLastContributionIdFromDatabase: function() {
		var self = this;

		self.reports.dbQuery(
			{
				text: "SELECT gaugeid, date_part('epoch', max(measuredatetime)) epoch FROM " + self.config.floodgauge.pg.table_floodgauge + " " +
				"GROUP BY gaugeid;"
			},
			function ( result ) {
				if (result && result.rows && result.rows.length > 0){
					for (var i = 0; i < result.rows.length; i++) {
						self._lastContributionTime[result.rows[i].gaugeid] = result.rows[i].epoch;
					}
					self.logger.info('Set last observation times from database');
				}
				else {
					self.logger.info('Error setting last observation time from database (is the reports table empty?)');
				}
			}
		);
	},

	/**
	* Connect to the data stream.
	* Retrieve data now and start polling for more data.
	*/
	start: function(){
		var self = this;

		// Initiate by getting last report ID from database
		self._updateLastContributionIdFromDatabase();

		// Called on interval to poll data source
		var poll = function(){
			self.logger.debug( "FloodgaugeDataSource > start: Polling " + self.config.floodgauge.serviceURL + " every " + self.config.floodgauge.pollInterval / 1000 + " seconds" );
			self._poll();
		};

		// Poll now, immediately
		poll();

		// Setup interval to poll repeatedly in future
		self._interval = setInterval(
			poll,
			self.config.floodgauge.pollInterval
		);
	},

	/**
	* Stop realtime processing of results and start caching results until caching mode is disabled.
	*/
	enableCacheMode: function() {
		var self = this;

		self.logger.verbose( 'FloodgaugeDataSource > enableCacheMode: Enabling caching mode' );
		self._cacheMode = true;
	},

	/**
	* Resume realtime processing of results.
	* Also immediately process any results cached while caching mode was enabled.
	*/
	disableCacheMode: function() {
		var self = this;

		self.logger.verbose( 'FloodgaugeDataSource > disableCacheMode: Disabling caching mode' );
		self._cacheMode = false;

		self.logger.verbose( 'FloodgaugeDataSource > disableCacheMode: Processing ' + self._cachedData.length + ' cached results' );
		self._cachedData.forEach( function(data) {
			self._processResult(data);
		});
		self.logger.verbose( 'FloodgaugeDataSource > disableCacheMode: Cached results processed' );
		self._cachedData = [];
	}

};

// Export the PowertrackDataSource constructor
module.exports = FloodgaugeDataSource;
