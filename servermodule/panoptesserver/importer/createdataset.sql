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
  `id` varchar(20),
  `len` float
);


CREATE TABLE `externallinks` (
  `linktype` varchar(20),
  `linkname` varchar(50),
  `linkurl` varchar(200)
);


 CREATE TABLE `propertycatalog` (
  `workspaceid` varchar(50),
  `source` varchar(50),
  `datatype` varchar(20),
  `propid` varchar(50),
  `tableid` varchar(20),
  `name` varchar(50),
  `ordr`  int(11) NOT NULL AUTO_INCREMENT,
  `settings` text,
  PRIMARY KEY (`ordr`)
);


CREATE TABLE `settings` (
  `id` varchar(20),
  `content` text
);

CREATE TABLE `storedqueries` (
  `id` varchar(50),
  `name` varchar(50),
  `tableid` varchar(50),
  `workspaceid` varchar(50),
  `content` text
);



CREATE TABLE `summaryvalues` (
  `workspaceid` varchar(50),
  `source` varchar(20),
  `propid` varchar(20),
  `tableid` varchar(20),
  `name` varchar(50),
  `ordr` int,
  `settings` text,
  `minval` float,
  `maxval` float,
  `minblocksize` int
);


CREATE TABLE `tablebasedsummaryvalues` (
  `tableid` varchar(50),
  `trackid` varchar(50),
  `trackname` varchar(50),
  `settings` varchar(5000),
  `minval` float,
  `maxval` float,
  `minblocksize` int
);


CREATE TABLE `tablecatalog` (
  `id` varchar(20),
  `name` varchar(50),
  `primkey` varchar(20),
  `IsPositionOnGenome` int,
  `settings` text,
  `ordr` int
);

CREATE TABLE `customdatacatalog` (
  `tableid` varchar(20),
  `sourceid` varchar(50),
  `settings` text
);

CREATE TABLE `relations` (
  `childtableid` varchar(40),
  `childpropid` varchar(40),
  `parenttableid` varchar(40),
  `parentpropid` varchar(40),
  `forwardname` varchar(50),
  `reversename` varchar(50)
);

CREATE TABLE `2D_tablecatalog` (
  `id` varchar(20),
  `name` varchar(50),
  `col_table` varchar(20),
  `row_table` varchar(20),
  `first_dimension` varchar(20),
  `settings` text,
  `ordr` int
);

CREATE TABLE `2D_propertycatalog` (
  `id` varchar(50),
  `tableid` varchar(20),
  `col_table` varchar(20),
  `row_table` varchar(20),
  `name` varchar(50),
  `ordr` int,
  `dtype` varchar(20),
  `settings` text
);

CREATE TABLE `workspaces` (
  `id` varchar(50),
  `name` varchar(50)
);


CREATE TABLE `introviews` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `workspaceid` varchar(100),
  `name` varchar(100),
  `section` varchar(100),
  `description` varchar(500),
  `ordr` int(11),
  `url` varchar(1000),
  `storedviewid` varchar(50),
  `activetab` varchar(50),
  PRIMARY KEY (`id`)
);

