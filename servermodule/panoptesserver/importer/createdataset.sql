CREATE TABLE `annotation` (
  `chromid` varchar(30),
  `fstart` int,
  `fstop` int,
  `fid` varchar(40),
  `fparentid` varchar(40),
  `ftype` varchar(20),
  `fname` varchar(60),
  `fnames` varchar(300),
  `descr` varchar(200),
  KEY `pfa_chrom` (`chromid`),
  KEY `pfa_type` (`ftype`),
  KEY `pfa_start` (`fstart`),
  KEY `pfa_stop` (`fstop`),
  KEY `pfa_name` (`fname`),
  KEY `pfa_id` (`fid`)
);

CREATE TABLE `chromosomes` (
  `id` varchar(255),
  `len` float
);


CREATE TABLE `externallinks` (
  `linktype` varchar(255),
  `linkname` varchar(255),
  `linkurl` varchar(2000)
);


 CREATE TABLE `propertycatalog` (
  `workspaceid` varchar(255),
  `source` varchar(255),
  `datatype` varchar(255),
  `propid` varchar(255),
  `tableid` varchar(255),
  `name` varchar(255),
  `ordr`  int(11) NOT NULL AUTO_INCREMENT,
  `settings` text,
  PRIMARY KEY (`ordr`)
);


CREATE TABLE `settings` (
  `id` varchar(255),
  `content` text
);

CREATE TABLE `storedsubsets` (
  `subsetid` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255),
  `tableid` varchar(255),
  `workspaceid` varchar(255),
  `membercount` int,
  PRIMARY KEY (`subsetid`)
);


CREATE TABLE `summaryvalues` (
  `workspaceid` varchar(255),
  `source` varchar(255),
  `propid` varchar(255),
  `tableid` varchar(255),
  `name` varchar(255),
  `ordr` int,
  `settings` text,
  `minval` float,
  `maxval` float,
  `minblocksize` int
);


CREATE TABLE `tablebasedsummaryvalues` (
  `tableid` varchar(255),
  `trackid` varchar(255),
  `trackname` varchar(255),
  `settings` text,
  `minval` float,
  `maxval` float,
  `minblocksize` int,
  `ordr` int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`ordr`)
);


 CREATE TABLE `graphs` (
  `graphid` varchar(255),
  `tableid` varchar(255),
  `tpe` varchar(255),
  `dispname` varchar(255),
  `settings` text,
  `crosslnk` varchar(255),
  `ordr`  int(11) NOT NULL AUTO_INCREMENT,
  PRIMARY KEY (`ordr`)
);


CREATE TABLE `tablecatalog` (
  `id` varchar(255),
  `name` varchar(255),
  `primkey` varchar(255),
  `IsPositionOnGenome` int,
  `settings` text,
  `defaultQuery` text,
  `ordr` int
);

CREATE TABLE `customdatacatalog` (
  `tableid` varchar(255),
  `sourceid` varchar(255),
  `settings` text
);

CREATE TABLE `relations` (
  `childtableid` varchar(255),
  `childpropid` varchar(255),
  `parenttableid` varchar(255),
  `parentpropid` varchar(255),
  `forwardname` varchar(255),
  `reversename` varchar(255)
);

CREATE TABLE `2D_tablecatalog` (
  `id` varchar(255),
  `name` varchar(255),
  `col_table` varchar(255),
  `row_table` varchar(255),
  `first_dimension` varchar(255),
  `settings` text,
  `ordr` int
);

CREATE TABLE `2D_propertycatalog` (
  `id` varchar(255),
  `tableid` varchar(255),
  `col_table` varchar(255),
  `row_table` varchar(255),
  `name` varchar(255),
  `ordr` int,
  `dtype` varchar(255),
  `settings` text,
  `arity` int
);

CREATE TABLE `workspaces` (
  `id` varchar(255),
  `name` varchar(255)
);


CREATE TABLE `notes` (
  `id` varchar(255),
  `tableid` varchar(255),
  `itemid` varchar(255),
  `timestamp` varchar(255),
  `userid` varchar(255),
  `content` text,
  PRIMARY KEY (`id`),
  FULLTEXT (`content`)
);
