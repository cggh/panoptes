CREATE SCHEMA "datasets";
ALTER USER "monetdb" SET SCHEMA "datasets";
SET SCHEMA "datasets";
CREATE TABLE datasetindex  (
   id  varchar(255) DEFAULT NULL,
   name  varchar(255) DEFAULT NULL,
   importtime varchar(255) DEFAULT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE calculations (
  id varchar(255) DEFAULT NULL,
  "user" varchar(255) DEFAULT NULL,
  "timestamp" varchar(255) DEFAULT NULL,
  name varchar(300) DEFAULT NULL,
  status varchar(300) DEFAULT NULL,
  progress float DEFAULT NULL,
  completed int DEFAULT NULL,
  failed int DEFAULT NULL,
  scope varchar(255) DEFAULT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE storedviews (
  dataset varchar(255) DEFAULT NULL,
  workspace varchar(255) DEFAULT NULL,
  id varchar(255) DEFAULT NULL,
  settings text DEFAULT NULL
);
CREATE TABLE storage (
  id varchar(255) DEFAULT NULL,
  content text,
  PRIMARY KEY (id)
);
