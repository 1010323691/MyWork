/*
Navicat MySQL Data Transfer

Source Server         : RexinTest
Source Server Version : 80013
Source Host           : localhost:3306
Source Database       : springboot_book

Target Server Type    : MYSQL
Target Server Version : 80013
File Encoding         : 65001

Date: 2021-01-14 10:48:14
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for `admin`
-- ----------------------------
DROP TABLE IF EXISTS `admin`;
CREATE TABLE `admin` (
  `a_id` int(11) NOT NULL AUTO_INCREMENT,
  `a_username` varchar(255) NOT NULL,
  `a_password` varchar(255) NOT NULL,
  PRIMARY KEY (`a_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of admin
-- ----------------------------
INSERT INTO `admin` VALUES ('1', 'root', 'root');
INSERT INTO `admin` VALUES ('2', 'admin', '123456');

-- ----------------------------
-- Table structure for `book`
-- ----------------------------
DROP TABLE IF EXISTS `book`;
CREATE TABLE `book` (
  `b_id` int(11) NOT NULL AUTO_INCREMENT,
  `b_name` varchar(255) NOT NULL,
  `b_author` varchar(255) NOT NULL,
  `b_press` varchar(255) NOT NULL,
  `b_stock` int(11) NOT NULL,
  `b_categoryid` int(11) NOT NULL,
  PRIMARY KEY (`b_id`),
  KEY `b_category` (`b_categoryid`),
  CONSTRAINT `b_category` FOREIGN KEY (`b_categoryid`) REFERENCES `category` (`c_id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of book
-- ----------------------------
INSERT INTO `book` VALUES ('1', 'C++程序设计课程设计', '孙忱', '机械工业出版社', '22', '1');
INSERT INTO `book` VALUES ('3', '朝花夕拾', '鲁迅', '天津人民出版社', '32', '3');
INSERT INTO `book` VALUES ('4', '线性代数', '张天德', '浙江教育出版社', '32', '2');
INSERT INTO `book` VALUES ('5', 'HTTPS权威指南', '[英]伊万·里斯蒂奇', '人民邮电出版社', '54', '1');
INSERT INTO `book` VALUES ('6', '人工智能真好玩', '张冰', '机械工业出版社', '21', '1');
INSERT INTO `book` VALUES ('7', '平凡的世界', '路遥', '北京十月文艺出版社', '11', '3');
INSERT INTO `book` VALUES ('8', '简爱', '夏洛蒂.勃朗特', '人民教育出版社', '56', '3');
INSERT INTO `book` VALUES ('9', '我从地球来', '闻新', '北京大学出版社', '11', '6');
INSERT INTO `book` VALUES ('10', '瓦尔登湖 全英文版', ' 亨利·戴维·梭罗', '中译出版社', '24', '3');
INSERT INTO `book` VALUES ('11', '世界文明史', '马克查', '北京大学出版社', '46', '15');
INSERT INTO `book` VALUES ('12', '明日辉煌', '闻新', '北京大学出版社', '33', '4');

-- ----------------------------
-- Table structure for `borrow`
-- ----------------------------
DROP TABLE IF EXISTS `borrow`;
CREATE TABLE `borrow` (
  `br_id` int(11) NOT NULL AUTO_INCREMENT,
  `br_outtime` datetime NOT NULL,
  `br_endtime` datetime NOT NULL,
  `br_backtime` datetime DEFAULT NULL,
  `br_ifreturn` int(11) NOT NULL,
  `br_record` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci DEFAULT NULL,
  `br_bookid` int(11) NOT NULL,
  `br_readerid` int(11) NOT NULL,
  PRIMARY KEY (`br_id`),
  KEY `br_book` (`br_bookid`),
  KEY `br_reader` (`br_readerid`),
  CONSTRAINT `br_book` FOREIGN KEY (`br_bookid`) REFERENCES `book` (`b_id`),
  CONSTRAINT `br_reader` FOREIGN KEY (`br_readerid`) REFERENCES `reader` (`r_id`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of borrow
-- ----------------------------
INSERT INTO `borrow` VALUES ('1', '2020-12-18 07:21:55', '2020-12-25 07:21:55', null, '0', null, '1', '4');
INSERT INTO `borrow` VALUES ('2', '2020-12-18 07:27:32', '2020-12-25 07:27:32', '2020-12-22 08:02:17', '1', '无', '1', '4');
INSERT INTO `borrow` VALUES ('3', '2020-12-22 06:30:05', '2020-12-29 06:30:05', null, '1', null, '3', '5');
INSERT INTO `borrow` VALUES ('4', '2020-12-22 07:20:13', '2020-12-29 07:20:13', '2020-12-22 08:03:14', '1', '无', '1', '6');
INSERT INTO `borrow` VALUES ('5', '2020-12-22 07:20:32', '2020-12-29 07:20:32', '2020-12-22 08:07:45', '1', 'wu', '3', '7');
INSERT INTO `borrow` VALUES ('6', '2020-12-22 07:31:09', '2020-12-29 07:31:09', '2020-12-22 08:04:30', '1', 'wu ', '3', '8');
INSERT INTO `borrow` VALUES ('8', '2020-12-22 08:07:14', '2020-12-29 08:07:14', '2020-12-22 08:07:23', '1', '无', '3', '6');
INSERT INTO `borrow` VALUES ('9', '2020-12-22 08:51:44', '2020-12-29 08:51:44', null, '0', null, '3', '10');
INSERT INTO `borrow` VALUES ('10', '2020-12-22 08:58:41', '2020-12-29 08:58:41', null, '0', null, '4', '11');
INSERT INTO `borrow` VALUES ('11', '2020-12-22 11:11:58', '2020-12-29 11:11:58', null, '0', null, '3', '11');
INSERT INTO `borrow` VALUES ('12', '2020-12-22 11:12:12', '2020-12-29 11:12:12', '2020-12-22 11:12:33', '1', '破损 罚款5元', '1', '11');
INSERT INTO `borrow` VALUES ('13', '2020-12-23 09:18:38', '2020-12-30 09:18:38', null, '0', null, '6', '10');
INSERT INTO `borrow` VALUES ('14', '2020-12-24 08:27:33', '2020-12-31 08:27:33', '2020-12-28 06:01:47', '1', '破损 罚款5元', '6', '11');
INSERT INTO `borrow` VALUES ('15', '2020-12-28 06:01:38', '2021-01-04 06:01:38', null, '0', null, '5', '11');
INSERT INTO `borrow` VALUES ('16', '2020-12-29 06:16:55', '2021-01-05 06:16:55', '2020-12-29 06:17:04', '1', '破损 罚款5元', '11', '11');
INSERT INTO `borrow` VALUES ('17', '2020-12-29 06:21:37', '2021-01-05 06:21:37', '2020-12-29 06:22:19', '1', '无', '10', '10');
INSERT INTO `borrow` VALUES ('18', '2021-01-05 06:44:28', '2021-01-12 06:44:28', null, '0', null, '1', '10');
INSERT INTO `borrow` VALUES ('19', '2021-01-11 13:58:41', '2021-01-18 13:58:41', '2021-01-11 13:58:58', '1', '', '1', '10');

-- ----------------------------
-- Table structure for `category`
-- ----------------------------
DROP TABLE IF EXISTS `category`;
CREATE TABLE `category` (
  `c_id` int(11) NOT NULL AUTO_INCREMENT,
  `c_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL,
  PRIMARY KEY (`c_id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of category
-- ----------------------------
INSERT INTO `category` VALUES ('1', '计算机');
INSERT INTO `category` VALUES ('2', '数学类');
INSERT INTO `category` VALUES ('3', '文学类');
INSERT INTO `category` VALUES ('4', '天文类');
INSERT INTO `category` VALUES ('5', '科学类');
INSERT INTO `category` VALUES ('6', '地理类');
INSERT INTO `category` VALUES ('7', '政治类');
INSERT INTO `category` VALUES ('8', '生物学');
INSERT INTO `category` VALUES ('9', '物理类');
INSERT INTO `category` VALUES ('10', '化学类');
INSERT INTO `category` VALUES ('15', '历史类');

-- ----------------------------
-- Table structure for `reader`
-- ----------------------------
DROP TABLE IF EXISTS `reader`;
CREATE TABLE `reader` (
  `r_id` int(11) NOT NULL AUTO_INCREMENT,
  `r_name` varchar(255) NOT NULL,
  `r_email` varchar(255) NOT NULL,
  `r_ifborrow` int(11) NOT NULL,
  PRIMARY KEY (`r_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8;

-- ----------------------------
-- Records of reader
-- ----------------------------
INSERT INTO `reader` VALUES ('1', '小明', '1010323691@qq.com', '1');
INSERT INTO `reader` VALUES ('4', '小红', '1234@qq.com', '1');
INSERT INTO `reader` VALUES ('5', '王亮', '224456@qq.com', '1');
INSERT INTO `reader` VALUES ('6', '晴子', 'qingzi@qq.com', '1');
INSERT INTO `reader` VALUES ('7', '王浩然', 'wanghaoran@qq.com', '1');
INSERT INTO `reader` VALUES ('8', '李天立', 'litianli@qq.com', '1');
INSERT INTO `reader` VALUES ('9', '', '', '1');
INSERT INTO `reader` VALUES ('10', '屈爱明', '1150297070@qq.com', '1');
INSERT INTO `reader` VALUES ('11', '高燊', '1010323691@qq.com', '1');
