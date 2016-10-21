CREATE TABLE "annotation" (
  "chromid" text,
  "fstart" int,
  "fstop" int,
  "fid" text,
  "fparentid" text,
  "ftype" text,
  "fname" text,
  "fnames" text,
  "descr" text
);

CREATE TABLE "settings" (
  "id" text,
  "content" text
);

CREATE TABLE "storedsubsets" (
  "subsetid" int NOT NULL AUTO_INCREMENT,
  "name" text,
  "tableid" text,
  "membercount" int,
  PRIMARY KEY ("subsetid")
);

 CREATE TABLE "graphs" (
  "graphid" text,
  "tableid" text,
  "tpe" text,
  "dispname" text,
  "settings" text,
  "crosslnk" text,
  "ordr"  int NOT NULL AUTO_INCREMENT,
  PRIMARY KEY ("ordr")
);

CREATE TABLE "notes" (
  "id" text,
  "tableid" text,
  "itemid" text,
  "timestamp" text,
  "userid" text,
  "content" text,
  PRIMARY KEY ("id")
);
