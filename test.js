/**
 * Created by yangj on 2017/6/15.
 */

var request = require('http').request;

var jsonObject = {
    'id': 123,
    'stock_id': 456,
    'amount': 100
};
var isSuccess = false;

var options;
options = {
    hostname: '127.0.0.1',
    port: 8765,
    path: '' + JSON.stringify(jsonObject),
    method: 'GET'
};
request(options, function (error, res, data) {
    console.log(data);
    if (data['body'] !== '0' || error || res.statusCode !== 200)
        console.log('freeze stock failed');
});

