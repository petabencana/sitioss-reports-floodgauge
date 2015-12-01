INSERT INTO floodgauge_reports (gaugeID, measuredatetime, depth, deviceid, reporttype, level, notificationflag, gaugenameid, gaugenameen, gaugenamejp, warninglevel, warningnameid, warningnameen, warningnamejp, observation_comment, the_geom) VALUES (
'gauge1',
'30-11-2015 12:00+0700',
30,
'gauge1',
'type1',
4,
0,
'gauge1',
'gauge1',
'gauge1',
4,
'level 4',
'level 4',
'level 4',
'no comment',
ST_GeomFromText('POINT (
106.826595 -6.175904)',4326)
);