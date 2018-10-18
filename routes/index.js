var express = require('express');
var router = express.Router();
var db = require('mongoose');
var request = require("http").request;
var app = require("../app");
var http = require('http');
var util = require('util');
var qs = require('querystring');
var fs = require('fs');
var flow = require('nimble');

/* GET home page. */
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});

var instructionCount = 0;
var getNowFormatDate = function () {
    var date = new Date();
    var month = date.getMonth() + 1;
    var strDate = date.getDate();
    var hour = date.getHours();
    var minute = date.getMinutes();
    var second = date.getSeconds();
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    if (hour < 10) {
        hour = "0" + hour;
    }
    if (minute < 10) {
        minute = "0" + minute;
    }
    if (second < 10) {
        minute = "0" + second;
    }

    var currentDate = date.getFullYear() + month + strDate + hour + minute + second;
    return parseInt(currentDate);
};
router.post('/StockSystem/TradingInstruction', function (req, res, next) {
    console.log("deal with trading instruction!");
    var instructionType = req.body.type;
    var stockID = req.body.stockID;
    var initiatorID = req.body.initiatorID;
    var stockAccountID = req.body.stockAccountID;
    var moneyAccountID = req.body.moneyAccountID;
    var price = req.body.price;
    var amount = req.body.amount;
    var lifeCycle = req.body.lifeCycle;
    var TradingInstructionModel = db.model("TradingInstruction");
    var TradingResultModel = db.model("TradingResult");
    var instructionID;
    var matchID;
    var matchInitiatorID;
    var matchStockAccountID;
    var matchMoneyAccountID;
    var matchPrice;
    var matchAmount;
    var resAmount;
    var resPrice;

    if (instructionType === 'buy')
        instructionID = 'BU00000' + instructionCount;
    else
        instructionID = 'SE00000' + instructionCount;
    flow.series([
        //save instruction
        function (callback) {
            var TradingIns = new TradingInstructionModel({
                instructionID: instructionID,
                initiatorID: initiatorID,
                stockAccountID: stockAccountID,
                moneyAccountID: moneyAccountID,
                instructionType: instructionType,
                stockID: stockID,
                price: price,
                amount: amount,
                instructionStatus: "waiting",
                startTime: getNowFormatDate(),
                lifeCycle: lifeCycle
            });

            TradingIns.save(function (err) {
                if (err !== null) {
                    console.log(err);
                    console.log("save tradingIns Error!");
                    res.write(JSON.stringify({'isSuccess': false}));
                    res.end();
                }
                else {
                    console.log("save tradingIns success!");
                    instructionCount++;
                    callback();
                }
            });
        },

        //freeze stock
        function (callback) {
            var jsonObj = {
                'id': stockAccountID,
                'stock_id': stockID,
                'amount': amount
            };
            var options = {
                hostname: '114.215.85.51',
                port: 5000,
                path: '/want_sell?' + qs.stringify(jsonObj),
                method: 'GET'
            };
            var freq = http.request(options, function (fres) {
                fres.on('data', function (chunk) {
                    // console.log("freeze stock error!")
                    // if (chunk !== "1") {
                    //     console.log('freeze stock failed!');
                    //     isSuccess = false;
                    // }
                    //freeze Money
                });

            });
            freq.on('error', function (e) {
                console.log('problem with request: ' + e.message);
            });
            freq.end();
            callback();
        },

        //freeze money
        function (callback) {
            var jsonObj = {
                'ID': moneyAccountID,
                'money': price * amount
            };
            var data = JSON.stringify(jsonObj);
            var options = {
                headers: {
                    "Content-Type": 'application/json',
                    "Content-Length": JSON.stringify(jsonObj).length
                },
                host: '123.206.193.39',
                port: 80,
                method: 'POST',
                path: '/fund/php/freezeMoney.php'
            };
            var freq = http.request(options, function (serverFeedback) {
                if (serverFeedback.statusCode === 200) {
                    serverFeedback.on('data', function (data) {
                    })
                }
            });
            freq.write(data);
            freq.end();
            console.log("freeze money success");
            callback();
        },

        //match instruction
        function (callback) {
            var conditions = {
                "stockID": stockID,
                "amount": {$gte: 0},
                "instructionStatus": "waiting",
                'initiatorID': {$ne: initiatorID}
            };

            if (instructionType === "buy") {
                conditions['instructionType'] = "sell";
                conditions['price'] = {$lte: price};
            }

            else {
                conditions['instructionType'] = "buy";
                conditions['price'] = {$gte: price};
            }
            console.log(conditions);
            TradingInstructionModel.find(
                conditions, function (err, data) {
                    var jsonObj = {};
                    if (data.length === 0) {
                        console.log("no match instruction found");
                        res.write(JSON.stringify({'isSuccess': false}));
                        res.end();
                    }
                    else {
                        matchID = data[0]['instructionID'];
                        matchInitiatorID = data[0]['initiatorID'];
                        matchStockAccountID = data[0]['stockAccountID'];
                        matchMoneyAccountID = data[0]['moneyAccountID'];
                        matchPrice = data[0]['price'];
                        matchAmount = data[0]['amount'];
                        resAmount = Math.min.apply(Math, [amount, matchAmount]);
                        if (instructionType === 'buy')
                            resPrice = price;
                        else
                            resPrice = matchPrice;
                        console.log("match instruction success");
                        callback();
                    }
                });
        },

        //update money account
        function (callback) {
            var jsonObj = {};
            if (instructionType === 'buy')
                jsonObj['ID'] = moneyAccountID;
            else
                jsonObj['ID'] = matchMoneyAccountID;
            jsonObj['money'] =resPrice * resAmount;
            var data = JSON.stringify(jsonObj);
            var options = {
                headers: {
                    "Content-Type": 'application/json',
                    "Content-Length": JSON.stringify(jsonObj).length
                },
                host: '123.206.193.39',
                port: 80,
                method: 'POST',
                path: '/fund/php/takeMoney.php'
            };
            var freq = http.request(options, function (serverFeedback) {
                if (serverFeedback.statusCode === 200) {
                    serverFeedback.on('data', function (data) {
                    })
                }
            });
            freq.write(data);
            freq.end();
            console.log("take money success");
            callback();
        },

        function (callback) {
            var jsonObj = {};
            if (instructionType === 'buy')
                jsonObj['ID'] = matchMoneyAccountID;
            else
                jsonObj['ID'] = MoneyAccountID;
            jsonObj['money'] =resPrice * resAmount;
            var data = JSON.stringify(jsonObj);
            var options = {
                headers: {
                    "Content-Type": 'application/json',
                    "Content-Length": JSON.stringify(jsonObj).length
                },
                host: '123.206.193.39',
                port: 80,
                method: 'POST',
                path: '/fund/php/saveMoney.php'
            };
            var freq = http.request(options, function (serverFeedback) {
                if (serverFeedback.statusCode === 200) {
                    serverFeedback.on('data', function (data) {
                    })
                }
            });
            freq.write(data);
            freq.end();
            console.log("take money success");
            callback();
        },

        //update stock account
        function (callback) {
            var jsonObj = {};
            jsonObj['stock_id'] = stockID;
            jsonObj['amount'] = resAmount;
            if (instructionType === 'buy') {
                jsonObj['id_1'] = matchStockAccountID;
                jsonObj['id_2'] = stockAccountID;
            }
            else {
                jsonObj['id_1'] = stockAccountID;
                jsonObj['id_2'] = matchStockAccountID;
            }

            var options = {
                hostname: '114.215.85.51',
                port: 5000,
                path: '/transaction?' + qs.stringify(jsonObj),
                method: 'GET'
            };
            var freq = http.request(options, function (fres) {
                fres.on('data', function (chunk) {
                    // console.log("update stock error!")
                    // if (chunk !== "1") {
                    //     console.log('freeze stock failed!');
                    //     isSuccess = false;
                    // }
                    //freeze Money
                });

            });
            freq.on('error', function (e) {
                console.log('problem with request: ' + e.message);
            });
            freq.end();
            console.log("update stock success!")
            callback();
        },

        //update instruction
        function (callback) {
            TradingInstructionModel.update(
                {instructionID: instructionID},
                {$set: {amount: amount - resAmount}}, function (err) {
                    if (err !== null) {
                        console.log("update instruction Error!");
                        res.write(JSON.stringify({"isSuccess": false}));
                        res.end();
                    }
                    else {
                        console.log('update instruction step 1 success');
                        callback();
                    }
                }
            );
        },
        function (callback) {
            if (amount === resAmount) {
                TradingInstructionModel.update(
                    {instructionID: instructionID},
                    {$set: {instructionStatus: 'done'}}, function (err) {
                        if (err !== null) {
                            console.log("update instruction Error!");
                            res.write(JSON.stringify({"isSuccess": false}));
                            res.end();
                        }
                        else {
                            console.log('update instruction step 2 success');
                            callback();
                        }
                    }
                );
            }
            else
                callback();
        },
        function (callback) {
            TradingInstructionModel.update(
                {instructionID: matchID},
                {$set: {amount: matchAmount - resAmount}}, function (err) {
                    if (err !== null) {
                        console.log("update instruction Error!");
                        res.write(JSON.stringify({"isSuccess": false}));
                        res.end();
                    }
                    else {
                        console.log('update instruction step 3 success');
                        callback();
                    }
                }
            );
        },
        function (callback) {
            if (matchAmount === resAmount) {
                TradingInstructionModel.update(
                    {instructionID: matchID},
                    {$set: {instructionStatus: 'done'}}, function (err) {
                        if (err !== null) {
                            console.log("update instruction Error!");
                        }
                        else{
                            console.log("update instruction success!");
                            callback();
                        }
                    }
                );
            }
            else {
                console.log("update instruction success!");
                callback();
            }
        },

        //store result
        function (callback) {
            var tradingResult = {};
            tradingResult['stockID'] = stockID;
            tradingResult['tradingTime'] = getNowFormatDate();
            tradingResult['price'] = resPrice;
            tradingResult['amount'] = resAmount;
            if (instructionType === "buy") {
                tradingResult['buyerID'] = initiatorID;
                tradingResult['sellerID'] = matchInitiatorID;
            }
            else {
                tradingResult['buyerID'] = matchInitiatorID;
                tradingResult['sellerID'] = initiatorID;
            }
            var tradingRes = new TradingResultModel(tradingResult);
            tradingRes.save(function (err) {
                if (err !== null) {
                    console.log(err);
                    console.log("save tradingRes Error!");
                    res.write(JSON.stringify({"isSuccess": false}));
                    res.end();
                }
                else {
                    console.log("save tradingRes success");
                    res.write(JSON.stringify({"isSuccess": true}));
                    res.end();
                }
            });
        }
    ]);
});


router.get('/StockSystem/QueryInstruction', function (req, res, next) {
    console.log(req.url);
    var params = url.parse(req.url, true).query;
    var instructionID = params.instructionID;
    var stockID = params.stockID;
    var initiatorID = params.initiatorID;
    var status = params.status;
    var type = params.type;
    var timeInterval = params.timeInterval.split(',');


    var conditions = {};
    if (instructionID !== '')
        conditions['instructionID'] = instructionID;
    if (stockID !== '')
        conditions['stockID'] = stockID;
    if (initiatorID !== '')
        conditions['initiatorID'] = initiatorID;
    if (status !== '')
        conditions['instructionStatus'] = status;
    if (type !== '')
        conditions['instructionType'] = type;
    if (timeInterval[0] !== '')
        conditions['startTime'] = {'$gte': timeInterval[0], '$lte': timeInterval[1]};
    console.log(conditions);

    console.log(conditions);
    var TradingInstructionModel = db.model('TradingInstruction');
    TradingInstructionModel.find(
        conditions, function (err, data) {
            var jsonObj = {};
            console.log(data);
            if (data.length === 0) {
                jsonObj['resNum'] = 0;
                jsonObj['instructionID'] = '';
                jsonObj['initiatorID'] = '';
                jsonObj['type'] = '';
                jsonObj['status'] = '';
                jsonObj['stockID'] = '';
                jsonObj['price'] = '';
                jsonObj['amount'] = '';

            }
            else {
                jsonObj['resNum'] = 1;
                jsonObj['instructionID'] = data[0]['instructionID'];
                jsonObj['initiatorID'] = data[0]['initiatorID'];
                jsonObj['type'] = data[0]['instructionType'];
                jsonObj['status'] = data[0]['instructionStatus'];
                jsonObj['stockID'] = data[0]['stockID'];
                jsonObj['price'] = data[0]['price'];
                jsonObj['amount'] = data[0]['amount'];
            }

            console.log(jsonObj);
            res.write(JSON.stringify(jsonObj));
            res.end();
        }
    );

});

router.get('/StockSystem/QueryResult', function (req, res, next) {
    console.log(req.url);
    var params = url.parse(req.url, true).query;
    var stockID = params.stockID;
    var sellerID = params.sellerID;
    var buyerID = params.buyerID;

    var conditions = {};
    if (stockID !== '')
        conditions['stockID'] = stockID;
    if (sellerID !== '')
        conditions['sellerID'] = sellerID;
    if (buyerID !== '')
        conditions['buyerID'] = buyerID;
    console.log(conditions);
    var TradingResultModel = db.model('TradingResult');
    TradingResultModel.find(
        conditions, function (err, data) {
            var jsonObj = {};
            if (data.length === 0) {
                jsonObj['time'] = '';
                jsonObj['stockID'] = '';
                jsonObj['sellerID'] = '';
                jsonObj['buyerID'] = '';
                jsonObj['price'] = '';
                jsonObj['amount'] = '';

            }
            else {
                console.log(data);
                jsonObj['time'] = data[0]['tradingTime'];
                jsonObj['stockID'] = data[0]['stockID'];
                jsonObj['sellerID'] = data[0]['sellerID'];
                jsonObj['buyerID'] = data[0]['buyerID'];
                jsonObj['price'] = data[0]['price'];
                jsonObj['amount'] = data[0]['amount'];
            }
            console.log(jsonObj);
            res.write(JSON.stringify(jsonObj));
            res.end();
        }
    );

});

module.exports = router;
