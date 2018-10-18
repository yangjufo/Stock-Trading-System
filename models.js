/**
 * Created by yangj on 2017/6/15.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://localhost/stocksystem');
mongoose.model('TradingResult', new Schema({
        stockID: String,
        tradingTime: Number,
        sellerID: String,
        buyerID: String,
        price: Number,
        amount: Number
    },
    {collection: 'TradingResults'}
));
mongoose.model('TradingInstruction', new Schema({
        instructionID: {type: String, unique: true},
        initiatorID: String,
        instructionType: String,
        stockID: String,
        stockAccountID: String,
        moneyAccountID: String,
        price: Number,
        amount: Number,
        startTime: Number,
        instructionStatus: String,
        lifeCycle: Number
    },
    {collection: 'TradingInstructions'}
));

