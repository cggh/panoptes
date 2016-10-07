CREATE SCHEMA "datasets";
ALTER USER "monetdb" SET SCHEMA "datasets";
SET SCHEMA "datasets";
CREATE TABLE datasetindex  (
   id  text DEFAULT NULL,
   name  text DEFAULT NULL,
   importtime text DEFAULT NULL,
    PRIMARY KEY (id)
);
CREATE TABLE calculations (
  id text NOT NULL,
  "user" text DEFAULT NULL,
  "timestamp" text DEFAULT NULL,
  name text DEFAULT NULL,
  status text DEFAULT NULL,
  progress float DEFAULT NULL,
  completed int DEFAULT NULL,
  failed int DEFAULT NULL,
  scope text DEFAULT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE storedviews (
  dataset text DEFAULT NULL,
  workspace text DEFAULT NULL,
  id text DEFAULT NULL,
  settings text DEFAULT NULL
);
CREATE TABLE storage (
  id text DEFAULT NULL,
  content text,
  PRIMARY KEY (id)
);
