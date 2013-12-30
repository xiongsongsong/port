/**
 * Created by wb-xiongsongsong on 13-12-26.
 */


define(function (require, exports, module) {

    var $ = require('$')


    //页面刷新的时候，清空下状态
    $.get('/client/visitorOffline.json')


    var AutoComplete = require('autocomplete')
    var Handlebars = require('handlebars')
    var survey = document.forms['survey']
    var $survey = $(survey)
    var $contentWrapper = $('#output-container')
    var $content = $('#output-content')
    var $waitInput = $('#J-wait-input')
    //当前聊天模式
    //xiaobao:智能机器人聊天
    //yunzaixian:人工客服聊天模式
    //waitYunzaixian 云在线排队状态
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
        '</h2><div class="content"><ul>' +
        '{{#each content}} <li>{{this}}</li> {{else}} Nothing {{/each}}' +
        '</ul></div>' +
        '</div>')

    //排队的模板
    var queueTpl = Handlebars.compile('<div class="queue J-run-queue"><div class="title">正在为您接通高级客服</div>' +
        '<div class="info">还有<span class="J-queuing-number">{{queuingNumber}}</span>人正在排队</div>' +
        '<a href="#"></a>' +
        '</div><br><br>')

    /*添加一个气泡*/
    function addPopup(data) {

        //如果当前在排队，则不接收服务器的通知
        //保证排队提示在页面最底部
        if (chatStatus === 'waitYunzaixian') return

        console.log('开始添加气泡，气泡状态', data.status)
        //todo:此处暂时用本地时间
        data.time = new Date()

        switch (data.status) {
            //用户发送消息所产生的气泡
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
            //服务器返回的气泡
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
                hideWaitInputTips()
                break;
            case 'delaySendMessage':
                $content.append('<div class="system-output">您发送消息的频率过快</div>')
                break;
            case 'sessionClosed':
                hideWaitInputTips()
                $content.append('<div class="system-output">长时间未聊天，系统已自动关闭</div>')
                break;
        }
        $content.stop().animate({scrollTop: $content[0].scrollHeight})
    }

    /*显示正在输入的提示框*/
    function showWaitInputTips() {
        clearTimeout($waitInput.data('cl'))
        $waitInput.data('cl', setTimeout(function () {
            if (chatStatus === 'waitYunzaixian') return
            $waitInput.show()
        }, 1800 + Math.random() * 1000))
    }

    /*隐藏正在输入的提示框*/
    function hideWaitInputTips() {
        clearTimeout($waitInput.data('cl'))
        $waitInput.hide()
    }

    exports.addPopup = addPopup

    /*
     * 发送给机器人的消息
     * 当接口的skillGroup>N的时候，则开始转人工服务
     * */
    function guideQuestion(content, callback) {
        showWaitInputTips()
        addPopup({
            status: 'chat',
            content: content
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
                setTimeout(function () {
                    addPopup({
                        status: 'server',
                        content: data.info.reply
                    })
                    if (parseInt(data.info.skillGroup, 10) > 3 && chatStatus !== 'waitYunzaixian') {
                        $('#artificial-service').show()
                        $contentWrapper.css({bottom: $('#artificial-service').height() - 1})
                    }
                    hideWaitInputTips()
                }, 2500 + Math.random() * 1000)

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
                    content: data.sendMessageForm.content
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
                case 'waitYunzaixian':

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
        }, 500)
    }

    //长链接，循环抓取服务器消息
    var beforeFetchMessageCl

    function fetchMessage() {
        //防止多次调用
        clearTimeout(beforeFetchMessageCl)
        //todo:t定义了2次
        var param = {
            token: '6a58013c7d2942459a63282f3d3172ed',
            t: 1388045910500,
            t: 1388045920516,
            mids: '',
            _input_charset: 'utf-8',
            language: 1,
            instanceId: 1,
            serviceToken: 'b21b38a97ff14a5983c13bd66d3b3ac1000'
        }
        $.ajax({
            url: '/fetchMessage.json',
            type: 'get',
            cache: false,
            dataType: 'json',
            data: param
        }).success(function (data) {
                $(data).each(function (index, item) {
                    var content
                    console.log('轮询消息,cmd:', item.cmd, '剩余排队人数' + item.count)
                    switch (item.cmd) {
                        //客服小休
                        case 'serverBreak':
                            content = '客服小休'
                            break;
                        //客服离线
                        case 'serverLeave':
                            content = '客服离线'
                            break;
                        //客服会话超时
                        case 'serverTimeOut':
                            content = '客服会话超时'
                            break;
                        //客服下班提醒
                        case 'serverOffLineRemind':
                            content = '客服下班提醒'
                            break;
                        //会话建立
                        case 'sessionStart':
                            content = item.content
                            $content.find('.J-queuing-number').text(0)
                            //将所有排队容器的排队标志去除
                            $content.find('.J-run-queue').removeClass('.J-run-queue')
                            chatStatus = 'yunzaixian'
                            addPopup({
                                status: 'server',
                                content: ['您好，我是[云客服：云裳，编号321]，很高兴为您服务。 ']
                            })
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000 + Math.random() * 500)
                            break;
                        //会话转接
                        case 'sessionSwitch':
                            content = '会话转接'
                            chatStatus = 'yunzaixian'
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000 + Math.random() * 500)
                            break;
                        //会话关闭
                        case 'sessionClosed':
                            chatStatus = 'xiaobao'
                            addPopup({
                                status: 'sessionClosed'
                            })
                            //停止轮询
                            clearTimeout(beforeFetchMessageCl)
                            $.get('/client/visitorOffline.json')
                            break;
                        //访客排队
                        case 'queueWait':
                            $content.find('.J-queuing-number').text(item.count)
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000 + Math.random() * 500)
                            break;
                        //访客离开
                        case 'userLeave':
                            content = '访客离开'
                            break;
                        //访客超时提醒
                        case 'userRemind':
                            content = '访客超时提醒'
                            break;
                        //文本消息
                        case 'text':
                            content = '文本消息'
                            chatStatus = 'yunzaixian'
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000 + Math.random() * 500)
                            showWaitInputTips()
                            setTimeout(function () {
                                addPopup({
                                    status: 'server',
                                    content: item.s
                                })
                                hideWaitInputTips()
                            }, 1000 + Math.random() * 100)
                            break;
                        //推送服务消息
                        case 'PUSH_SERVICE':
                            content = '推送服务消息'
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000 + Math.random() * 500)
                            break;
                        //客服推送登录服务
                        case 'NEED_LOGIN':
                            content = 'NEED_LOGIN'
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000 + Math.random() * 500)
                            break;
                        //访客登录成功
                        case 'LOGIN_SUCCESS':
                            content = '访客登录成功'
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000 + Math.random() * 500)
                            break;
                        //访客拒绝登录
                        case 'LOGIN_REFUSE':
                            content = '访客拒绝登录'
                            break;
                        //访客登录失败
                        case 'LOGIN_FAIL':
                            content = '访客登录失败'
                            break;
                    }

                })
            })
            .error(function () {
                //todo:出错次数超出阈值时取消
                beforeFetchMessageCl = setTimeout(function () {
                    fetchMessage()
                }, 1000 + Math.random() * 500)
            })
    }

    //当和云在线沟通后，保持绘画链接
    function keepAlive() {
        $.ajax({
            url: '/keepAlive.json',
            dataType: 'json',
            data: {
                //r是临时参数，本地测试使用
                r: Date.now(),
                token: '6a58013c7d2942459a63282f3d3172ed',
                t: 1388045535760,
                _input_charset: 'utf-8',
                language: 1,
                instanceId: 1,
                serviceToken: 'b21b38a97ff14a5983c13bd66d3b3ac1000'
            }
        }).success(function (data) {
                console.log('保持会话，结果：' + data)
            })
    }

    setInterval(function () {
        //只要是云在线状态，则进行会话状态维持
        if (chatStatus === 'yunzaixian') {
            console.log('尝试保存会话')
            keepAlive()
        }
    }, 90000)
    //当切换到人工在线客服的时候
    $(document).on('click', '.J-switch-to-yun-zaixian', function () {
        $content.append(queueTpl({queuingNumber: '...'}))
        $('#artificial-service').hide()
        $contentWrapper.css({bottom: 1})
        $content.stop().animate({scrollTop: $content[0].scrollHeight})
        chatStatus = 'waitYunzaixian'
        fetchMessage()
    })

    //当显示了转人工的浮层或其他诸如此类的高度改变时
    //重新调整chat框框的高度
    function changeUI() {

    }

    /*当提交表单的时候*/
    $survey.on('submit', function (ev) {
        ev.preventDefault()

        if (chatStatus === 'waitYunzaixian') return

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
        if (chatStatus === 'waitYunzaixian') return
        var value = this.value
        var self = this
        sendMessage(value, function () {
            self.value = ''
            countTextareaLeft()
        })
    })

    /*统计剩余字数*/
    $(survey.elements['content']).on('keypress', function (ev) {
        setTimeout(function () {
            countTextareaLeft()
        }, 0)
    })

    function countTextareaLeft() {
        $survey.find('.J-left').text(200 - survey.elements['content'].value.length)
    }

    /*当点击服务器返回的list的时候，发送消息出去*/
    $content.on('click', '#output-content li', function (ev) {
        sendMessage($(ev.currentTarget).text())
    })

    /*点击有帮助时，关闭浮层*/
    $('.J-helpful').on('click', function () {
        $('#artificial-service').hide()
        $contentWrapper.css({bottom: 1})
    })

    /*自动提示*/
    new AutoComplete({
        trigger: survey.elements['content'],
        dataSource: 'http://sug.so.360.cn/suggest/word?word={{query}}&t={{timestamp}}&encodein=utf-8&encodeout=utf-8',
        locator: 's',
        align: {
            selfXY: ['0', '100%'],
            baseXY: ['0', '-10%']
        }
    }).render().on('itemSelect', function (ev) {
            if (chatStatus !== 'waitYunzaixian') {
                sendMessage(ev.matchKey, function () {
                    survey.elements['content'].value = ''
                })
            } else {
                survey.elements['content'].value = ev.matchKey
            }
        });

    /*关闭公告*/
    $(document).on('click', '.J-close-notify', function () {
        $('#global-notify').slideUp()
    })

})
