/**
 * Created by yangj on 2017/6/15.
 */


//TODO：前后端逻辑，前端接收客户端发来的post请求解析后，用socket.io发给该文件

var io = require("socket.io")('2233');
var db = require("./models.js");
var request = require("http").request;


//交易指令
function TradingInstruction() {
    this.instructionID = "";
    this.initiatorID = "";
    this.instructionType = "";
    this.stockID = "";
    this.StockName = "";
    this.stockAccountID = "";
    this.moneyAccountID = "";
    this.price = 0.00;
    this.amount = 0;
    this.startTime = "";
    this.instructionStatus = "waiting";
    this.lifeCycle = 0;
    this.setInstruction = function (instructionID, initiatorID, stockAccountID, moneyAccountID, instructionType, stockID,
                                    price, amount, instructionStatus, startTime, lifeCycle) {
        this.instructionID = instructionID;
        this.initiatorID = initiatorID;
        this.stockAccountID = stockAccountID;
        this.moneyAccountID = moneyAccountID;
        this.instructionType = instructionType;
        this.stockID = stockID;
        this.price = price;
        this.amount = amount;
        this.startTime = startTime;
        this.instructionStatus = instructionStatus;
        this.lifeCycle = lifeCycle;
    };

    this.storeInstruction = function () {
        //将指令存入数据库
        var tradingIns = new db.TradingInstructionModel({
            instructionID: this.instructionID,
            initiatorID: this.initiatorID,
            stockAccountID: this.stockAccountID,
            moneyAccountID: this.moneyAccountID,
            tradingType: this.tradingType,
            stockID: this.stockID,
            price: this.price,
            amount: this.amount,
            instructionStatus: this.instructionStatus,
            startTime: this.startTime,
            lifeCycle: this.lifeCycle
        });

        tradingIns.save(function (err) {
            if (err !== null) {
                console.log(err);
                console.log("save tradingIns Error!");
            }
        });
    };

    this.updateStatus = function (status) {
        //更新指令状态
        db.TradingInstructionModel.update(
            {instructionID: this.instructionID}, {$set: {instructionStatus: status}});
    };

    this.updateAmount = function () {
        db.TradingInstructionModel.update({
            instructionID: this.instructionID
        }, {$set: {amount: this.amount}});
        if (this.amount === 0) {
            this.updateStatus("invalid")
        }
    };


    this.checkLife = function () {
        //检查指令声明周期是否已过，如已过，修改指令
        // 先把所有时间都转换成时间戳timestamp
        var now_ts = Date.parse(new Date());
        var startTime_ts = Date.parse(new Date(this.startTime));
        var lifeCycle_ts = Date.parse(new Date(this.lifeCycle));

        if (now_ts > startTime_ts + lifeCycle_ts) {
            this.instructionStatus = "invalid";
            db.TradingInstructionModel.update({instructionID: this.instructionID}, {$set: {instructionStatus: this.instructionStatus}});
            //invalid返回一个false
            return false;
        } else {
            return true;
        }
    };

    this.findMatch = function () {
        //查找数据库中是否有匹配指令，注意检查指令的状态以及生命周期
        //如有返回匹配指令ID，没有返回-1
        var res = -1;
        if (this.checkLife() === false || this.instructionStatus === "invalid" || this.amount == 0)
            return res;
        if (this.type === "sell") {
            res = db.TradingInstructionModel.find(
                {
                    "stockID": this.stockID,
                    "price": {$gte: this.price},
                    "type": "buy",
                    "amount": {$gte: 0},
                    "instructionStatus": {$ne: "invalid"}
                },
                {
                    "initiatorID": 0,
                    "stockAccountID": 0,
                    "moneyAccountID": 0,
                    "tradingType": 0,
                    "stockID": 0,
                    "price": 0,
                    "amount": 0,
                    "instructionStatus": 0,
                    "startTime": 0,
                    "lifeCycle": 0
                }
            );
        }
        else {
            res = db.TradingInstructionModel.find(
                {
                    "stockID": this.tradingInstruction.stockID,
                    "price": {$lte: this.tradingInstruction.price},
                    "type": "sell",
                    "amount": {$gt: 0},
                    "instructionStatus": {$ne: "invalid"}
                },
                {
                    "initiatorID": 0,
                    "stockAccountID": 0,
                    "moneyAccountID": 0,
                    "tradingType": 0,
                    "stockID": 0,
                    "price": 0,
                    "amount": 0,
                    "instructionStatus": 0,
                    "startTime": 0,
                    "lifeCycle": 0
                }
            );
        }
        return res;
    };
}


//交易结果
function TradingResult() {
    this.stockID = "";
    this.stockName = "";
    this.tradingTime = "";
    this.sellerID = "";
    this.buyerID = "";
    this.price = "";
    this.amount = "";
    this.setTradingResult = function (stockID, stockName, tradingTime, sellerID,
                                      buyerID, price, amount) {
        this.stockID = stockID;
        this.stockName = stockName;
        this.tradingTime = tradingTime;
        this.sellerID = sellerID;
        this.buyerID = buyerID;
        this.price = price;
        this.amount = amount;
    };

    this.storeResult = function () {
        //将交易结果存入数据库
        var tradingRes = new db.TradingResultModel({
            stockID: this.stockID,
            stockName: this.stockName,
            tradingTime: this.tradingTime,
            sellerID: this.sellerID,
            buyerID: this.buyerID,
            price: this.price,
            amount: this.amount
        });
        tradingRes.save(function (err) {
            if (err !== null) {
                console.log(err);
                console.log("save tradingRes Error!");
            }
        });
    };

    this.sendResultForward = function () {
        //将结果发送到信息发布系统
        var jsonRes = {
            'stockID': this.stockID,
            'tradingTime': this.tradingTime,
            'sellerID': this.sellerID,
            'buyerID': this.buyerID,
            'price': this.price,
            'amount': this.amount
        };

        var socket = io.connect("http://localhost:2233");
        socket.emit("tradingRes", jsonRes, function (callback) {
            if (callback !== null) {
                console.log("success");
                return true;
            }
            else {
                console.log("failed");
                return false;
            }
        });
    };

    this.sendResultUser = function () {
        //将结果发送到交易客户端
        var jsonRes = {
            'stockID': this.stockID,
            'tradingTime': this.tradingTime,
            'sellerID': this.sellerID,
            'buyerID': this.buyerID,
            'price': this.price,
            'amount': this.amount
        };
        var isSuccess = false;
        request({
            url: "",            // TODO:客户端地址
            method: "POST",
            json: true,
            body: jsonRes
        }, function (error, response, body) {
            console.log(response);
            isSuccess = body['success'];
        });
        return isSuccess;
    };
}



//处理交易指令，即匹配交易
function dealTradingInstruction() {


    this.tradingInstruction = new TradingInstruction();
    this.freezeMoney = function () {
        //冻结资金账户相应部分资金
        var jsonObject = {
            'ID': this.tradingInstruction.moneyAccountID,
            'money': this.tradingInstruction.price * this.tradingInstruction.amount
        };
        var isSuccess = false;
        request({
            url: "http://127.0.0.1:8080/AssetSystem/freezeMoney.php",
            method: "POST",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isSuccess = body['success'];
        });
        return isSuccess;
    };

    this.freezeStock = function () {
        //冻结证券账户相应部分股票
        var jsonObject = {
            'id': this.tradingInstruction.stockAccountID,
            'stock_id': this.tradingInstruction.stockID,
            'amount': this.tradingInstruction.amount
        };
        var isSuccess = false;
        request({
            url: "http://127.0.0.1:8080/want_sell",
            method: "GET",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isSuccess = body['success'];
        });
        return isSuccess;
    };

    this.checkMatch = function () {
        //检查是否有指令匹配
        //返回值不为-1，调用getInstruction，获得指令
        var res = this.findMatch();
        var realAmount = 0;
        if (res.size() === 0) {
            return;
        }

        var getNowFormatDate = function () {
            var date = new Date();
            var month = date.getMonth() + 1;
            var strDate = date.getDate();
            if (month >= 1 && month <= 9) {
                month = "0" + month;
            }
            if (strDate >= 0 && strDate <= 9) {
                strDate = "0" + strDate;
            }
            var currentDate = date.getFullYear() + month + strDate + date.getHours() + date.getMinutes() + date.getSeconds();
            return parseInt(currentDate);
        };

        this.bestMatchInstruction = this.getInstruction(res[0]);
        for (inst in res) {
            if (inst === res[0])
                continue;
            var matchInstruction = this.getInstruction(inst);
            if (this.tradingInstruction.type === "sell") {
                if (matchInstruction.price > this.bestMatchInstruction.price) {
                    this.bestMatchInstruction = matchInstruction;
                }
            }
            if (this.tradingInstruction.type === "buy") {
                if (matchInstruction.price < this.bestMatchInstruction.price) {
                    this.bestMatchInstruction = matchInstruction;
                }
            }
        }
        var amount = min(this.bestMatchInstruction.amount, this.tradingInstruction.amount);
        var price = min(this.bestMatchInstruction.price, this.tradingInstruction.price);
        this.tradingResult.setTradingResult(this.bestMatchInstruction.stockID, getNowFormatDate(), this.bestMatchInstruction.stockName, this.bestMatchInstruction.initiatorID, this.tradingInstruction.initiatorID, price, amount);
        this.storeResult();
        this.updateMoney();
        this.updateStock();
        this.tradingInstruction.amount = this.tradingInstruction.amount - amount;
        this.bestMatchInstruction.amount = this.bestMatchInstruction.amount - amount;
        this.updateAmount(this.bestMatchInstruction.amount);
        this.bestMatchInstruction.updateAmount(this.tradingInstruction.amount);
        return this.checkMatch();
    };


    //如果有匹配

    this.checkMoneyAccount = function () {
        var jsonObject = {'ID': this.tradingInstruction.moneyAccountID};
        var isValid = false;
        request({
            url: "http://127.0.0.1:8080/AssetSystem/isValidAccount.php",
            method: "POST",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isValid = body['success'];
        });
        if (!isValid) {
            this.tradingInstruction.updateStatus('invalid');
            return false;
        }

        jsonObject = {'ID': this.bestMatchInstruction.moneyAccountID};
        request({
            url: "http://127.0.0.1:8080/AssetSystem/isValidAccount.php",
            method: "POST",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isValid = body['success'];
        });
        if (!isValid)
            this.bestMatchInstruction.updateStatus('invalid');
        return isValid;


    };

    this.checkStockAccount = function () {
        var jsonObject = {'id': this.tradingInstruction.stockAccountID};
        var isValid = false;
        var result = [];
        request({
            url: "http://127.0.0.1:8080/information",
            method: "GET",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            result = body['result'];
            isValid = result['available'];
        });
        if (!isValid) {
            this.tradingInstruction.updateStatus('invalid');
            return false;
        }

        jsonObject = {'id': this.bestMatchInstruction.stockAccountID};
        isValid = false;
        result = [];
        request({
            url: "http://127.0.0.1:8080/information",
            method: "GET",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            result = body['result'];
            isValid = result['available'];
        });
        if (!isValid)
            this.bestMatchInstruction.updateStatus('invalid');
        return isValid;
    };

    this.updateMoney = function () {
        //更新资金账户，删除冻结部分资金
        //更新另一账户，增加资金
        var takeMoneyFromID = this.tradingResult.buyerID;
        var addMoneyToID = this.tradingResult.sellerID;
        var money = this.tradingResult.price * this.tradingResult.amount;

        var jsonObject = {'ID': takeMoneyFromID, 'money': money};
        var isSuccessTake = false;
        request({
            url: "http://127.0.0.1:8080/AssetSystem/takeMoney.php",
            method: "POST",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isSuccessTake = body['success'];
        });

        var jsonObject = {'ID': addMoneyToID, 'money': money};
        var isSuccessAdd = false;
        request({
            url: "http://127.0.0.1:8080/AssetSystem/saveMoney.php",
            method: "GET",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isSuccessAdd = body['success'];
        });

        return isSuccessTake && isSuccessAdd;
    };

    this.updateStock = function () {
        //更新证券账户，删除冻结部分股票
        //更细另一证券账户，增加股票
        var takeStockFromID = this.tradingResult.buyerID;
        var addStockToID = this.tradingResult.sellerID;
        var stockID = this.tradingResult.stockID;
        // var money = this.tradingResult.price * this.tradingResult.amount;
        var amount = this.tradingResult.amount;

        var jsonObject = {'id_1': takeStockFromID, 'id_2': addStockToID, 'stock_id': stockID, 'amount': amount};
        var isSuccessTake = false;
        request({
            url: "http://127.0.0.1:8080/want_sell",
            method: "GET",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isSuccessTake = body['success'];
        });

        var jsonObject = {'ID': addStockToID, 'amount': amount, 'stockID': stockID};
        var isSuccessAdd = false;
        request({
            url: "http://127.0.0.1:8080/transcation",
            method: "GET",
            json: true,   // <--Very important!!!
            body: jsonObject
        }, function (error, response, body) {
            console.log(response);
            isSuccessAdd = body['success'];
        });

        return isSuccessTake && isSuccessAdd;

    };
}


//TODO：接收前端的请求执行操作
var getTradingInstruction = new dealTradingInstruction();
socket.on("tradingInstruction", function (inst) {
    console.log("receive trading instruction");
    inst = JSON.parse(inst);
    getTradingInstruction.tradingInstruction.set(inst.instructionID, inst.initiatorID, inst.stockAccountID, inst.moneyAccountID, inst.instructionType, inst.stockID,
        inst.price, inst.amount, inst.instructionStatus, inst.startTime, inst.lifeCycle);
    doTrading(getTradingInstruction);
});


var doTrading = function (inst) {
    inst.tradingResult = new TradingResult();
    inst.tradingInstruction.storeInstruction();
    if (!inst.freezeMoney())
        if (!inst.freezeStock())
            if (!inst.checkMatch())
                if (!inst.checkMoneyAccount())
                    if (!inst.checkStockAccount())
                        if (!isnt.tradingResult.storeResult())
                            if (!inst.tradingResult.sendResultUser())
                                if (!inst.tradingResult.sendResultUser())
                                    if(!inst.updateMoney())
                                        if(!inst.updateStock())
                                            console("trade succeed");
};