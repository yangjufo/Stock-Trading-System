/**
 * Created by yangj on 2017/6/15.
 */

//可以调用该接口显示股票走势
//var request = require("http").request;
//console.log("here");
//
//stockInfo = function () {
//    var options ={
//        hostname: "http://stock.market.alicloudapi.com",
//        path: "/realtime-k",
//        Authorization: "APPCODE d0c1bb9cbdea40d5ab4db4d1cfbeaadb",
//        method:'GET'
//    };
//
//    var req = request(options, function(res){
//        res.on('data', function(chunk){
//            console.log(chunk);
//            //TODO:获取股票信息，下面是阿里云的接口
//            //https://market.aliyun.com/products/56928004/cmapi014124.html#sku=yuncode812400000
//        })
//    });
//};
//
//var si = new stockInfo();

//
//var request = require('request');
//    var options ={
//        hostname: "http://www.baidu.com",
//        //path: "/realtime-k",
//        //Authorization: "APPCODE d0c1bb9cbdea40d5ab4db4d1cfbeaadb",
//        method:'GET'
//    };
//request(options, function (error, response, body) {
//    if (!error && response.statusCode == 200) {
//        console.log(body) // 打印google首页
//    }
//})

var app = require('./app');
var io = require('socket.io')(app.server);


var url = 'http://stock.market.alicloudapi.com/realtime-k';
var params = {  //还有一些可选参数,参照api
    from: 5,
    needAlarm: 1,
    needIndex: 1
};

var headers = {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': 'APPCODE ' + 'd0c1bb9cbdea40d5ab4db4d1cfbeaadb'    //填写你自己的appcode
};

var querys = {};
querys["beginDay"] =  "20161101";
querys["code"] =  "600004";
querys["time"] =  "day";
querys["type"] =  "bfq";



//var schedule = require('node-schedule');
var request = require('request');
//schedule.scheduleJob('30 30 * * * *', function(){


io.on('connection', function (socket) {
    console.log("connect socket 222222!");
});

io.on('getStockInfo', function (socket) {
    console.log("getStockInfo");
    var options = {
        url: url,
        method: 'GET',
        headers: headers,  //请求头
        qs: params,  //请求参数
        querys: querys
    }
    //Start the request
    request(options, function(error, response, body) {
        if(error){
        }else{
            //api调用成功后的操作
            console.log("success!");
            //console.log(response);
            socket.emit('retStockInfo', { data: response});
        }
    })
});

//});