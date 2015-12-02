CREATE TABLE floodgauge_reports (
pkey serial,
gaugeID varchar NOT NULL,
measureDateTime timestamp with time zone NOT NULL,
depth integer,
deviceID varchar,
reportType varchar,
level integer,
notificationFlag integer,
gaugeNameId varchar,
gaugeNameEn varchar,
gaugeNameJp varchar,
warningLevel integer,
warningNameId varchar,
warningNameEn varchar,
warningNameJp varchar,
observation_comment varchar,
  CONSTRAINT pkey_floodgauge_reports PRIMARY KEY (pkey)

);

-- Add Geometry column to reports
SELECT AddGeometryColumn ('public','floodgauge_reports','the_geom',4326,'POINT',2);

-- Add GIST spatial index
CREATE INDEX gix_floodgauge_reports ON floodgauge_reports USING gist (the_geom);

-- Create types for floodgauge data output
CREATE TYPE obs_type AS (
  measuredatetime timestamp with time zone,
  depth integer,
  warninglevel integer,
  warningnameid varchar
);

CREATE TYPE prop_type AS (
	gaugeid varchar,
  gaugenameid varchar,
	observations json
);
