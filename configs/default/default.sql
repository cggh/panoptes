DROP DATABASE IF EXISTS datasetindex;
CREATE DATABASE datasetindex;
USE datasetindex;

CREATE TABLE `datasetindex` (
  `id` varchar(20) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

LOCK TABLES `datasetindex` WRITE;
INSERT INTO `datasetindex` VALUES ('test_dataset','Test Data');
UNLOCK TABLES;

CREATE TABLE `calculations` (
  `id` varchar(50) NOT NULL,
  `user` varchar(50) DEFAULT NULL,
  `timestamp` varchar(50) DEFAULT NULL,
  `name` varchar(300) DEFAULT NULL,
  `status` varchar(300) DEFAULT NULL,
  `progress` float DEFAULT NULL,
  `completed` int(11) DEFAULT NULL,
  `failed` int(11) DEFAULT NULL,
  `scope` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `storedviews` (
  `dataset` varchar(100) DEFAULT NULL,
  `workspace` varchar(100) DEFAULT NULL,
  `id` varchar(100) DEFAULT NULL,
  `settings` varchar(10000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `storage` (
  `id` varchar(50) DEFAULT NULL,
  `content` text,
  UNIQUE KEY `storage_id` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

/*############################################################*/
DROP DATABASE IF EXISTS test_dataset;
CREATE DATABASE test_dataset;
USE test_dataset;

CREATE TABLE `workspaces` (
  `id` varchar(50) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

LOCK TABLES `workspaces` WRITE;
INSERT INTO `workspaces` VALUES ('1337','Test workspace');
UNLOCK TABLES;

CREATE TABLE `tablecatalog` (
  `id` varchar(20) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `primkey` varchar(20) DEFAULT NULL,
  `IsPositionOnGenome` int(11) DEFAULT NULL,
  `settings` varchar(2000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

LOCK TABLES `tablecatalog` WRITE;
INSERT INTO `tablecatalog` VALUES ('widget','Widgets','widgetid',0,NULL);
UNLOCK TABLES;

CREATE TABLE `propertycatalog` (
  `workspaceid` varchar(50) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `datatype` varchar(20) DEFAULT NULL,
  `propid` varchar(50) DEFAULT NULL,
  `tableid` varchar(20) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `ordr` int(11) DEFAULT NULL,
  `settings` varchar(1000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

LOCK TABLES `propertycatalog` WRITE;
INSERT INTO `propertycatalog` VALUES ('', 'fixed', 'Text', 'widgetid', 'widget', 'Widget id', '0', NULL), ('', 'fixed', 'Value', 'Size', 'widget', 'Widget Size', '1', NULL), ('', 'fixed', 'Text', 'Colour', 'widget', 'Widget Colour', '2', NULL), ('', 'fixed', 'Text', 'Country', 'widget', 'Widget Country', '3', NULL);
UNLOCK TABLES;

CREATE TABLE `widget` (
  `widgetid` varchar(20) DEFAULT NULL,
  `Size` float DEFAULT NULL,
  `Colour` varchar(20) DEFAULT NULL,
  `Country` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

LOCK TABLES `widget` WRITE;
INSERT INTO `widget` VALUES ('w1', 2.5, 'black','Estonia'),('wb', 5.3, 'chocolate','Belgium');
UNLOCK TABLES;

CREATE VIEW `widgetCMB_1337` AS select * from `widget`;

CREATE TABLE `chromosomes` (
  `id` varchar(20) DEFAULT NULL,
  `len` float DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

INSERT INTO `chromosomes` VALUES ('MAL1', '0.640851');

CREATE TABLE `annotation` (
  `chromid` varchar(30) DEFAULT NULL,
  `fstart` int(11) DEFAULT NULL,
  `fstop` int(11) DEFAULT NULL,
  `fid` varchar(40) DEFAULT NULL,
  `fparentid` varchar(40) DEFAULT NULL,
  `ftype` varchar(20) DEFAULT NULL,
  `fname` varchar(60) DEFAULT NULL,
  `fnames` varchar(200) DEFAULT NULL,
  `descr` varchar(300) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


CREATE TABLE `summaryvalues` (
  `workspaceid` varchar(50) DEFAULT NULL,
  `source` varchar(20) DEFAULT NULL,
  `propid` varchar(20) DEFAULT NULL,
  `tableid` varchar(20) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `ordr` int(11) DEFAULT NULL,
  `settings` varchar(2000) DEFAULT NULL,
  `minval` float DEFAULT NULL,
  `maxval` float DEFAULT NULL,
  `minblocksize` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `tablebasedsummaryvalues` (
  `tableid` varchar(50) DEFAULT NULL,
  `trackid` varchar(50) DEFAULT NULL,
  `trackname` varchar(50) DEFAULT NULL,
  `settings` varchar(2000) DEFAULT NULL,
  `minval` float DEFAULT NULL,
  `maxval` float DEFAULT NULL,
  `minblocksize` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `settings` (
  `id` varchar(20) DEFAULT NULL,
  `content` varchar(2000) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `externallinks` (
  `linktype` varchar(20) DEFAULT NULL,
  `linkname` varchar(50) DEFAULT NULL,
  `linkurl` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `storedqueries` (
  `id` varchar(50) DEFAULT NULL,
  `name` varchar(50) DEFAULT NULL,
  `tableid` varchar(50) DEFAULT NULL,
  `workspaceid` varchar(50) DEFAULT NULL,
  `content` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;









