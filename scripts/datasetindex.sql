CREATE TABLE IF NOT EXISTS datasetindex  (
   id  varchar(255) DEFAULT NULL,
   name  varchar(255) DEFAULT NULL,
   importtime varchar(255) DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS calculations (
  id varchar(255) NOT NULL,
  user varchar(255) DEFAULT NULL,
  timestamp varchar(255) DEFAULT NULL,
  name varchar(300) DEFAULT NULL,
  status varchar(300) DEFAULT NULL,
  progress float DEFAULT NULL,
  completed int(11) DEFAULT NULL,
  failed int(11) DEFAULT NULL,
  scope varchar(255) DEFAULT NULL,
  PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS storedviews (
  dataset varchar(255) DEFAULT NULL,
  workspace varchar(255) DEFAULT NULL,
  id varchar(255) DEFAULT NULL,
  settings text DEFAULT NULL
);
CREATE TABLE IF NOT EXISTS storage (
  id varchar(255) DEFAULT NULL,
  content text,
  UNIQUE KEY storage_id (id)
);
