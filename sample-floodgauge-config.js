'use strict';

// sample-floodgauge-config.js - sample configuration file for cognicity-reports-floodgauge module

/**
 * Configuration for cognicity-reports-floodgauge
 * @namespace {object} config
 * @property {object} floodgauge Configuration object for floodgauge web service interface
 * @property {string} floodgauge.serviceURL The URL for the floodgauge web service
 * @property {number} floodgauge.pollInterval Poll interval for web service in milliseconds
 * @property {number} floodgauge.historicalLoadPeriod Maximum age in milliseconds of reports which will be processed
 * @property {object} dims.pg Postgres configuration
 * @property {string} dims.pg.table_floodgauge Database table to store floodgauge reports in
 */
var config = {};

// Floodgauge web service API
config.floodgauge = {};
config.floodgauge.serviceURL = "http://example.com/cgi-bin/wlr"; // E.g. https://example.com/cgi-bin/wlr
config.floodgauge.pollInterval = 1000 * 60 * 15; // E.g. 1000 * 60 * 15 = 15 minutes
config.floodgauge.historicalLoadPeriod = 1000 * 60 * 120; // E.g. 1000 * 60 * 120 = 2 hours

// Floodgauge configuration for cognicity-schema
config.floodgauge.pg = {};
config.floodgauge.pg.table_floodgauge = 'floodgauge.reports';

module.exports = config;
