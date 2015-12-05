'use strict';

/**
 * @file Cognicity reports data module which retrieves tweet data from the BPBD floodgauge API (Siaga Levels)
 * @copyright (c) Tomas Holderness & SMART Infrastructure Facility November 2015
 * @license Released under GNU GPLv3 License (see LICENSE.txt).
 * @example
 * Must be run as a subfolder of cognicity-reports, and
 * cognicity-reports must be configured to use this datasource.
 */

var FloodgaugeDataSource = require('./FloodgaugeDataSource');
var config = require('./live-floodgauge-config');
/**
 * The constructor function we expose takes a reports object and returns an instance of this
 * data source, with configuration already injected.
 */
var constructor = function( reports ) {
	return new FloodgaugeDataSource( reports, config );
};

module.exports = constructor;
