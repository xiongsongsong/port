/**
 * Created by wb-xiongsongsong on 13-12-26.
 */


define(function (require, exports, module) {

    var $ = require('$')
    var AutoComplete = require('autocomplete')
    var Handlebars = require('handlebars')
    var survey = document.forms['survey']
    var $survey = $(survey)
    var $content = $('#output-content')
    //当前聊天模式
    //xiaobao:智能机器人聊天
    //yunzaixian:人工客服聊天模式
    var chatStatus = 'xiaobao'

    //判断消息发送频率
    var delaySendMessage = false
    //发送消息间隔的定时器
    var delaySendMessageCL

    //用户消息的模板
    var clientChatTpl = Handlebars.compile('<div class="client" style="padding-bottom:12px">' +
        '<h2><span class="header">{{hour}}:{{minute}} 我</span><a class="avatar"><img src="./main/img/avatar.png"></a></h2>' +
        '<div class="content">{{content}}</div>' +
        '</div>')

    //服务器消息返回的模板
    var serverChatTpl = Handlebars.compile('<div class="server">' +
        '<h2><span class="header"><b class="nick">小宝</b> ' +
        '<b class="time"> {{hour}}:{{minute}}</b>' +
        '</span><a class="avatar"><img src="./main/img/avatar.png"></a>' +
        '</h2><div class="content">{{content}}</div>' +
        '</div>')

    //排队的模板
    var queueTpl = Handlebars.compile('<div class="queue"><div class="title">正在为您转到人工服务</div>' +
        '<div class="info">还有32人正在排队</div></div>')

    /*添加一个气泡*/
    function addPopup(data) {

        console.log('开始添加气泡，气泡状态', data.status)

        switch (data.status) {
            case 'chat':
                console.log('显示用户发送的消息')
                var hour = data.time.getHours()
                var minute = data.time.getMinutes()
                hour = hour.toString().length === 1 ? '0' + hour.toString() : hour
                minute = minute.toString().length === 1 ? '0' + minute.toString() : minute
                $content.append(clientChatTpl({
                    hour: hour,
                    minute: minute,
                    content: data.content
                }))
                break;
            case 'server':
                console.log('显示服务器发送的消息')
                var hour = data.time.getHours()
                var minute = data.time.getMinutes()
                hour = hour.toString().length === 1 ? '0' + hour.toString() : hour
                minute = minute.toString().length === 1 ? '0' + minute.toString() : minute
                $content.append(serverChatTpl({
                    hour: hour,
                    minute: minute,
                    content: data.content
                }))
                break;
            case 'delaySendMessage':
                $content.append('<div class="input-fast">您发送消息的频率过快</div>')
                break;
        }
        $content.stop().animate({scrollTop: $content[0].scrollHeight})
    }

    exports.addPopup = addPopup

    /*
     * 发送给机器人的消息
     * 当接口的skillGroup>N的时候，则开始转人工服务
     * */
    function guideQuestion(content, callback) {
        addPopup({
            status: 'chat',
            content: content,
            time: new Date()
        })
        $.ajax({
            url: '/guideQuestion.json',
            dataType: 'jsonp',
            jsonp: '_callback',
            data: {
                times: 1,
                question: content,
                servicelogId: '',
                token: 'b21b38a97ff14a5983c13bd66d3b3ac1000',
                t: '1388045081645',
                _output_charset: 'utf-8',
                _input_charset: 'utf-8',
                r: 1388045081645,
                language: 1,
                instanceId: 1,
                serviceToken: 'b21b38a97ff14a5983c13bd66d3b3ac1000'
            }
        }).success(function (data) {
                addPopup({
                    status: 'server',
                    content: data.info.reply,
                    time: new Date()
                })
                if (data.info.skillGroup < 1) {
                    $content.append(queueTpl({}))
                }
            }).error(function () {

            })
    }

    /*
     * 发送给人工客服的消息
     * */

    function sendMessageToXiaobao(content, callback) {
        $.ajax({
            url: '/sendMessage.json?sid=d419f135176e4990a7f218c3448f21fd003&utype=1&token=6a58013c7d2942459a63282f3d3172ed&uid=2013122616044503&t=1388045086637&language=1&instanceId=1&serviceToken=b21b38a97ff14a5983c13bd66d3b3ac1000',
            type: 'post',
            dataType: 'json',
            data: {
                content: content,
                uname: '访客',
                _input_charset: 'utf-8'
            }
        }).success(function (data) {
                addPopup({
                    status: 'chat',
                    content: data.sendMessageForm.content,
                    time: new Date(data.time)
                })
            })
            .error(function () {
                alert("消息发送失败，请再尝试一次");
            })
    }

    /*发送消息*/
    function sendMessage(content, callback) {
        console.log('开始发送消息')
        if ($.trim(content).length < 1) {
            return
        }
        if (!delaySendMessage) {
            delaySendMessage = true

            console.log('当前状态', chatStatus)
            switch (chatStatus) {
                case 'xiaobao':
                    guideQuestion(content, callback)
                    break;
                case 'yunzaixian':
                    sendMessageToXiaobao(content, callback)
                    break;
            }

            if (callback) callback()
        } else {
            addPopup({
                status: 'delaySendMessage',
                content: '您发送频率过快'
            })
        }
        //放置发送信息频率过快
        clearTimeout(delaySendMessageCL)
        delaySendMessageCL = setTimeout(function () {
            delaySendMessage = false
        }, 800)
    }

    exports.sendMessage = sendMessage

    /*当提交表单的时候*/
    $survey.on('submit', function (ev) {
        ev.preventDefault()
        var value = survey.elements['content'].value
        sendMessage(value, function () {
            survey.elements['content'].value = ''
            countTextareaLeft()
        })
    })

    //当回车的时候
    $(survey.elements['content']).on('keypress', function (ev) {
        countTextareaLeft()
        if (ev.keyCode !== 13) return;
        ev.preventDefault()
        var value = this.value
        var self = this
        sendMessage(value, function () {
            self.value = ''
            countTextareaLeft()
        })
    })

    $(survey.elements['content']).on('keypress', function (ev) {
        setTimeout(function () {
            countTextareaLeft()
        }, 0)
    })

    function countTextareaLeft() {
        $survey.find('.J-left').text(200 - survey.elements['content'].value.length)
    }

    /*自动提示*/
    new AutoComplete({
        trigger: survey.elements['content'],
        dataSource: ['abc', 'abd', 'cbd', 'effff', 'y1', 'y2', 'y4', 'j4ghsd'],
        align: {
            selfXY: ['0', '100%'],
            baseXY: ['0', '-10%']
        }
    }).render();


})
