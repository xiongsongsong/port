/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 80);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}


http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});


app.get('/mobile/similarQuestions.json', function (req, res) {
    if (Math.random() * 10 < 2) {
        res.json({"msg": "参数不合法", "stat": "fail"})
    } else {
        res.json({"msg": "参数不合法", "stat": "fail1111"})
    }
})


//获取当前是否人工客服时间段
app.get('/checkServiceTime.json', function (req, res) {
    res.header('content-type', 'application/json;charset=utf-8')
    res.end(req.query._callback + '(' + JSON.stringify(
        {"stat": "ok",
            "info": {
                "uname": "访客",
                "orderMessage": "",
                "serviceTime": "true"
            }
        }, undefined, '  ') + ');')
})

//textarea的自动提示
app.get('/inputSuggest.json', function (req, res) {
    res.header('content-type', 'application/json;charset=utf-8')
    var data = {"stat": "ok", "info": {"result": [
        ["查询快捷支付（卡通）余额的方法", "74"],
        ["充值的金额如何取出？", "3"],
        ["充值方式的选择方法", "22"],
        ["常用银行快捷支付（卡通）区别", "1"],
        ["充值退回介绍", "16"],
        ["成长点有什么用？", "3"],
        ["成长点可以购买吗？", "1"],
        ["充值码充值流程", "59"],
        ["充值退回", "79"],
        ["查询红包信息流程", "1"]
    ]}}
    res.header('content-type', 'application/javascript;charset=utf-8')
    res.end(req.query._callback + '(' + JSON.stringify(data, undefined, '  ') + ')')
})

//在人工开始之前的对话请求，注意：一旦人工开始后，就改用fetchMessage抓取消息
var skillGroupCount = 5
app.get('/guideQuestion.json', function (req, res) {
    res.header('content-type', 'application/json;charset=utf-8')
    skillGroupCount--
    var data = {
        time: Date.now(),
        "stat": "ok",
        "info": {"reply": '还有' + skillGroupCount + '次转人工' + req.query.question.split('').reverse().join(''), "skillGroup": skillGroupCount.toString()}
    }
    res.header('content-type', 'application/javascript;charset=utf-8')
    setTimeout(function () {
        res.end(req.query._callback + '(' + JSON.stringify(data, undefined, '  ') + ')')
    }, Math.random() * 1000)

})


//一旦skillGroupCount大于N，则客户端会发送connectServer.json 尝试连接人工
app.get('/client/connectServer.json', function (req, res) {
    res.header('content-type', 'application/json;charset=utf-8')
    var data =
    {
        "uid": "2013122710153901",
        "count": 137,
        "token": "09f5bf76fcf343e7b935036885ac7723",
        "serviceTime": true,
        "uname": "访客",
        "utype": "1",
        "welcome": "<b style=\"font-family: tahoma, arial, verdana, sans-serif; color: rgb(0, 0, 0); font-size: 12px; \">为确保您的证件信息安全性，请勿通过截图方式上传身份证、银行卡等图片信息！<\/b>" +
            "<br><br><font face=\"arial\"><font color=\"#ff0000\">公告：<\/font>" +
            "<font style=\"font-size: 10pt; \" color=\"#ff0000\">" +
            "亲爱的客户您好，如您遇到昨天使用工行快捷支付付款款项未到账的情况，请您在今天下午18点之后关注，" +
            "当前建议您先换其他方式完成该笔交易<\/font><\/font><br>",
        "msg": "您前面还有<font color=\"FF6600\"><span style=\"color: rgb(255, 153, 0); background-color: rgb(255, 255, 255);\">136<\/span>" +
            "<\/font>位访客正在等候服务，请稍候！\n<br><br><font color=\"#ff9900\">" +
            "【温馨提示】<\/font>排队高峰期，建议您先咨询" +
            "<font color=\"#0000ff\"><a href=\"#\" class=\"J_ResumeRobot\">智能小宝<\/a><\/font>." +
            "<br>（<font color=\"#ff9900\">余额宝问题 <\/font>" +
            "<a href=\"http://help.alipay.com/lab/help_detail.htm?help_id=257308\" target=\"_blank\">点此查看<\/a>）",
        "stat": "ok"
    }
    res.header('content-type', 'application/json;charset=utf-8')
    res.json(data)
})

//轮询抓取消息
var 模拟排队 = 20

setInterval(function () {
    模拟排队--
}, 1000)

app.get('/fetchMessage.json', function (req, res) {
    res.header('content-type', 'application/json;charset=utf-8')

    var data = [
        {
            "bankCardNo": "",
            "cmd": "queueWait",
            "content": "您前面还有<font color=\"#ff6600\"><span style=\"BACKGROUND-COLOR: rgb(255,255,255); COLOR: rgb(255,153,0)\">'+模拟排队+'<\/span><\/font>位访客正在等候服务，预计需等" +
                "<font color=\"#ff6600\"><span style=\"BACKGROUND-COLOR: rgb(255,255,255); COLOR: rgb(255,153,0)\">1<\/span><\/font>分钟,请稍候！\n<br><br>" +
                "<font color=\"#ff9900\">【温馨提示】<\/font>排队高峰期，建议您先咨询 " +
                "<font color=\"#0000ff\"><a href=\"#\" class=\"J_ResumeRobot\">智能小宝<\/a><\/font>." +
                "<br>（<font color=\"#ff9900\">余额宝问题 <\/font>" +
                "<a href=\"http://help.alipay.com/lab/help_detail.htm?help_id=257308\" target=\"_blank\">点此查看<\/a>）",
            "count": 27,
            "email": "",
            "encryptVisitorId": "",
            "extValues": {
                "ACTIVE_SERVER": "119",
                "msg_id": "86251", "^queueCount$": "27", "estimateWaitTime": "1"},
            "identify": false, "logonId": "", "mid": "86251", "reasonFlag": 0,
            "serverName": "", "sid": "", "uname": "", "visitorId": "",
            "visitorToken": "0e4a76f53c4f446b9d414532e8ef452e"}
    ]

    var data2 = [
        {"bankCardNo": "", "cmd": "sessionStart", "content": "您好，欢迎使用支付宝在线客服，我是云在线10888，很高兴为您服务。<br>" +
            "模拟排队，还有：" + 模拟排队 + '位人',
            "count": 0, "email": "", "encryptVisitorId": "",
            "extValues": {
                "contextToken": "d419f135176e4990a7f218c3448f21fd003",
                "msg_id": "0bd90", "msg_code": "CONVERSATION_CONNECT"
            },
            "identify": false, "logonId": "", "mid": "0bd90", "reasonFlag": 0, "serverName": "云在线10888",
            "sid": "d419f135176e4990a7f218c3448f21fd003", "uname": "", "visitorId": "",
            "visitorToken": "6a58013c7d2942459a63282f3d3172ed"
        }
    ]

    var data3 = [
        {
            "bankCardNo": "",
            "cmd": "sessionClosed",
            "content": "由于您长时间未有响应，系统已结束您的对话。",
            "count": 0, "email": "", "encryptVisitorId": "",
            "extValues": {
                "actor_type": "1", "msg_id": "47746", "msg_code": "CONVERSATION_CLOSE", "^closeType$": "2"
            },
            "identify": false, "logonId": "",
            "mid": "47746", "reasonFlag": 2,
            "serverName": "", "sid": "d419f135176e4990a7f218c3448f21fd003",
            "uname": "", "visitorId": "",
            "visitorToken": "6a58013c7d2942459a63282f3d3172ed"
        }
    ]


    if (模拟排队 > 0) {
        res.end(JSON.stringify(data))
    } else if (模拟排队 < 0 && 模拟排队 >= -20) {
        res.end(JSON.stringify(data2))
    } else if (模拟排队 < -20) {
        res.end(JSON.stringify(data3))
    }
})

//当cmd返回sessionStart的时候，client可以开始调用sendMessage接口，第一次调用的时候，客户端必须将之前问的问题全部发送过来。
app.post('/sendMessage.json', function (req, res) {

    var data = {
        "time": "2013-12-27 11:06:10",
        "sendMessageForm": {
            "content": req.body.content + Date.now(),
            "sid": "018a340b761c4bfb8f2e3c5486d47a07006",
            "src": "",
            "token": "70947407aed94fe1a5dca0c0db06f580",
            "uname": "访客",
            "utype": "1"
        }, "stat": "ok"
    }
    res.header('content-type', 'application/json;charset=utf-8')
    res.json(data)
})


//结束会话
app.get('/client/visitorOffline.json', function (req, res) {
    模拟排队 = 20
    res.json({"msg": "处理成功", "stat": "ok"})

})