'use strict';

// sample-qlue-config.js - sample configuration file for cognicity-reports-qlue module

/**
 * Configuration for cognicity-reports-powertrack
 * @namespace {object} config
 * @property {object} floodgauge Configuration object for Qlue web service interface
 * @property {string} floodgauge.serviceURL The URL for the Qlue web service
 * @property {number} floodgauge.pollInterval Poll interval for web service in milliseconds
 * @property {number} floodgauge.historicalLoadPeriod Maximum age in milliseconds of reports which will be processed
 */
var config = {};

// Floodgauge web service API
config.floodgauge = {};
config.floodgauge.serviceURL = "http://example.com/cgi-bin/wlr"; // E.g. https://example.com/cgi-bin/wlr
config.floodgauge.pollInterval = 1000 * 60 * 15; // E.g. 1000 * 60 * 15 = 15 minutes
config.floodgauge.historicalLoadPeriod = 1000 * 60 * 120; // E.g. 1000 * 60 * 120 = 2 hours

// Floodgauge configuration for cognicity-schema
config.floodgauge.pg = {};
config.floodgauge.pg.table_floodgauge = 'floodgauge_reports';

module.exports = config;
