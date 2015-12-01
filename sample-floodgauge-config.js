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
config.floodgauge.pollInterval = 1000 * 60 * 60; // E.g. 1000 * 60 * 60 = 60min
config.floodgauge.historicalLoadPeriod = 1000 * 60 * 70; // E.g. 1000 * 60 * 60 = 70 minutes

// Floodgauge configuration for cognicity-schema
config.floodgauge.pg = {};
config.floodgauge.pg.table_floodgauge = 'floodgauge_reports';

module.exports = config;
