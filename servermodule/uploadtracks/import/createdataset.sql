CREATE TABLE `annotation` (
  `chromid` varchar(30),
  `fstart` int,
  `fstop` int,
  `fid` varchar(40),
  `fparentid` varchar(40),
  `ftype` varchar(20),
  `fname` varchar(60),
  `fnames` varchar(45),
  `descr` varchar(45),
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
  `ordr` int,
  `settings` text
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
  `settings` text
);


CREATE TABLE `workspaces` (
  `id` varchar(50),
  `name` varchar(50)
);