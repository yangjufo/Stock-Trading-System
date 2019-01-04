

var io = require("socket.io");
var db = require("./models.js");
var request = require("http").request;

//指令历史查询
function queryTradingInstruction() {
    this.instructionID = "";
    this.stockID = "";
    this.stockName = "";
    this.initiatorID = "";
    this.status = "";
    this.type = "";
    this.timeInterval = {};
    var conditions = {};
    this.queryResult = [];
    this.setQueryTradingInstruction = function (instructionID, stockID, stockName, initiatorID,
                                                status, type, timeInterval) {
        this.instructionID = instructionID;
        this.stockID = stockID;
        this.initiatorID = initiatorID;
        this.status = status;
        this.type = type;
        this.timeInterval = timeInterval;
    };
    this.getTradingInstruction = function () {
        //根据有效的查询信息，格式即为 TradingInstruction ，将结果存入queryResult并返回
        if (this.instructionID !== null)
            conditions.push({'instructionID': this.instructionID});
        if (this.stockName !== null)
            conditions.push({'stockName': this.stockName});
        if (this.stockID !== null)
            conditions.push({'stockID': this.stockID});
        if (this.initiatorID !== null)
            conditions.push({'initiatorID': this.initiatorID});
        if (this.status !== null)
            conditions.push({'instructionStatus': this.status});
        if (this.type !== null)
            conditions.push({'type': type});
        if (this.timeInterval !== null)
            conditions.push({'time': {'$gte': this.timeInterval.Start, '$lte': this.timeInterval.End}});
        this.queryResult = db.TradingInstructionModel.find(conditions);
        return this.queryResult;
    }
}


//交易结果查询
function queryTradingResult() {
    this.stockID = "";
    this.stockName = "";
    this.amount = "";
    this.price = {};                // price，totalCost，timeInterval 必须包含{Start, End}
    this.totalCost = {};            //总金额
    this.timeInterval = {};
    this.queryResultReturn = new queryTradingResultReturn();
    this.setQueryTradingResult = function (stockID, stockName, price,
                                           amount, totalCost, timeInterval) {
        this.stockID = stockID;
        this.stockName = stockName;
        this.price = price;
        this.amount = amount;
        this.totalCost = totalCost;
        this.timeInterval = timeInterval;
    }
    this.getTradingResult = function () {
        //根据条件，返回查找到的结果（queryTradingResultReturn）对象，存入queryResult，并返回
        // 先判断查询是否合法
        if (this.price !== null)
            if (this.price.Start > this.price.End) {
                return;
            }
        if (this.totalCost !== null)
            if (this.totalCost.Start > this.totalCost.End) {
                return;
            }
        if (this.timeInterval.Start > this.timeInterval.End) {
            return;
        }

        // 合法
        return this.queryResult.setQueryTradingResultReturn(this.timeInterval, this.stockID, this.stockName, this.price, this.amount, this.totalCost);
    }
}

//交易结果返回对象
function queryTradingResultReturn() {
    this.timeInterval = {};
    this.stockID = "";
    this.amount = "";
    this.stockName = "";
    this.price = {};
    this.totalCost = {};
    this.setQueryTradingResultReturn = function (timeInterval, stockID, stockName, price,
                                                 amount, totalCost) {
        this.timeInterval = timeInterval;   // {}
        this.stockID = stockID;
        this.stockName = stockName;
        this.price = price;                 // {}
        this.amount = amount;
        this.totalCost = totalCost;         // {}

        var res = [];
        var conditions = {};
        if (this.stockID !== null) conditions.push({'stockID': this.stockID});
        if (this.stockID === null && this.stockName !== null)

            if (this.timeInterval !== null) conditions.push({
                'timeInterval': {
                    '$gte': this.timeInterval.Start,
                    '$lte': this.timeInterval.End
                }
            });
        // if (this.stockName != null) conditions.push('stockName': this.stockName);
        if (this.price !== null) conditions.push({'price': {'$gte': this.price.Start, '$lte': this.price.End}});
        if (this.totalCost !== null) conditions.push({
            'totalCost': {
                '$gte': this.totalCost.Start,
                '$lte': this.totalCost.End
            }
        });
        res = db.TradingResultModel.find(conditions);

        return res;
    }
}

//指令历史查询，朱灏
function dealQueryTradingInstruction() {

    var queryTradingInstruction = new queryTradingInstruction;

    this.queryTradingInstruction = queryTradingInstruction;
    this.queryTadingInstructionReturn = [];

    this.getQueryTradingInstruction = function () {
        //获得历史指令，并发送到请求端（工作人员）
        //如果没有找到，返回错误信息，将所有字段置为空

        this.queryTadingInstructionReturn = this.queryTradingInstruction.getInstruction();

        var jsonRes = null;
        if (this.queryTadingInstructionReturn.length !== 0) {
            jsonRes = {
                "instructionID": "",
                "initiatorID": "",
                "stockAccountID": "",
                "moneyAccountID": "",
                "tradingType": "",
                "stockID": "",
                "price": 0,
                "amount": 0,
                "instructionStatus": "invalid",
                "startTime": 0,
                "lifeCycle": 0
            };
        }
        else {
            jsonRes = this.queryTadingInstructionReturn;
        }
        var isSuccess = false;
        request({
            url: "",            // 客户端地址
            method: "POST",
            json: true,
            body: jsonRes
        }, function (error, response, body) {
            console.log(response);
            isSuccess = body["success"];
        });
        return isSuccess;
    }
}


//交易结果查询
function dealQueryResult() {

    this.queryTradingResult = new queryTradingResult();

    this.queryTradingResultReturn = [];
    this.getQueryTradingResult = function () {

        this.queryTradingResultReturn = this.queryTradingResult.getTradingResult();

        var jsonRes = null;
        if (this.queryTradingResultReturn === null) {
            jsonRes = {'stockID': "", 'tradingTime': "", 'sellerID': "", 'buyerID': "", 'price': "", 'amount': ""};
        }
        else {
            jsonRes = this.queryTradingResultReturn;
        }
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
    }
}

var getQueryInstruction = new dealQueryTradingInstruction();
var getQueryResult = new dealQueryResult();

socket.on("queryTradingRes", function (cond) {
    console.log("receive trading instruction");
    var cond = JSON.parse(cond);
    getQueryResult.queryTradingResult.setQueryTradingResult(cond.stockID, cond.stockName, cond.price, cond.amount, cond.totalCost, cond.timeInterval);
    doQueryResult(getQueryResult);
});

socket.on('queryTradingIns', function (cond) {
    var cond = JSON.parse(cond);
    getTradingInstruction.setQueryTradingInstruction(inst.instructionID, inst.stockID, inst.stockName, isnt.initiatorID,
        cond.status, isnt.type, inst.timeInterval)
    getTradingInstruction.queryTradingInstruction.setQueryTradingInstruction(cond.instructionID, cond.initiatorID, cond.instructionID, cond.stockID, cond.stockName,
        cond.initiatorID, cond.status, cond.type, cond.timeInterval)
    doQueryInstruction(getQueryInstruction);
});

var doQueryResult = function (inst) {
    inst.getTradingResult();
};

var doQueryInstruction = function (inst) {
    inst.getQueryTradingInstruction()
}