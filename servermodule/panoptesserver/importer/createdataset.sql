CREATE TABLE "annotation" (
  "chromid" varchar(30),
  "fstart" int,
  "fstop" int,
  "fid" varchar(40),
  "fparentid" varchar(40),
  "ftype" varchar(20),
  "fname" varchar(60),
  "fnames" varchar(300),
  "descr" varchar(200)
);

CREATE TABLE "settings" (
  "id" varchar(255),
  "content" text
);

CREATE TABLE "storedsubsets" (
  "subsetid" int NOT NULL AUTO_INCREMENT,
  "name" varchar(255),
  "tableid" varchar(255),
  "membercount" int,
  PRIMARY KEY ("subsetid")
);

 CREATE TABLE "graphs" (
  "graphid" varchar(255),
  "tableid" varchar(255),
  "tpe" varchar(255),
  "dispname" varchar(255),
  "settings" text,
  "crosslnk" varchar(255),
  "ordr"  int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY ("ordr")
);

CREATE TABLE "notes" (
  "id" varchar(255),
  "tableid" varchar(255),
  "itemid" varchar(255),
  "timestamp" varchar(255),
  "userid" varchar(255),
  "content" text,
  PRIMARY KEY ("id")
);
