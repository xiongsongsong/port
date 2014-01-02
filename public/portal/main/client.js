/**
 * Created by wb-xiongsongsong on 13-12-26.
 */


define(function (require, exports, module) {

    var $ = require('$')

    var Xbox = require('alipay/xbox/1.1.2/xbox')


    //页面刷新的时候，清空下状态
    $.get('/client/visitorOffline.json')
    var $document = $(document)

    var AutoComplete = require('autocomplete')
    var Handlebars = require('handlebars')
    var survey = document.forms['survey']
    var $survey = $(survey)
    /*对话框的外围容器*/
    var $contentWrapper = $('#output-container')
    //存放对话节点的容器
    var $content = $('#output-content')
    var $waitInput = $('#J-wait-input')
    //提交聊天form的按钮
    var $submitBtn = $('#main-submit-btn')
    //当前聊天模式
    //xiaobao:智能机器人聊天
    //yunzaixian:人工客服聊天模式
    //waitYunzaixian 云在线排队状态
    var chatStatus = 'xiaobao'

    /*
     当fetchMessage抓取到受理单时，将返回的mid值放置在此变量上存储
     在pushWindow的时候会携带上
     */
    var mid

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

        console.log('添加气泡，类型：', data.status)
        //todo:此处暂时用本地时间
        data.time = new Date()

        switch (data.status) {
            //用户发送消息所产生的气泡
            case 'chat':
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
                    console.log('当前skillGroup值：' + data.info.skillGroup, '，阈值：' + 2)
                    if (parseInt(data.info.skillGroup, 10) >= 2 && chatStatus !== 'waitYunzaixian') {
                        $('#artificial-service').show()
                        console.log('显示转人工')
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


    var config = {
        '取消提现身份证推框': 'CANCEL_WITHDRAW_WINDOW',
        '签约信息查询获取身份证推框': 'QUERY_CARD_SIGN_WINDOW',
        '快捷交易明细银行卡号推送框': 'POS_TRADE_DETAIL_WINDOW',
        '受理单创建联系邮箱推送框': 'TASK_EMAIL_WINDOW',
        '受理单创建身份证推框': 'TASK_IDENTIFY_WINDOW',
        '用户输入登录账号推框': 'USER_LOGON_ID',
        '登录框': 'LOGIN_WINDOW',
        '修改登录email推送框': 'TASK_LOGIN_EMAIL_WINDOW',
        '身份证号': 'identifyId',
        '邮箱': 'TASK_LOGIN_EMAIL_WINDOW',
        '请再输入一遍邮箱': 'reemail',
        '支付宝账号': 'logonId',
        '银行卡号': 'bankCardNo',
        '原因': 'reason'
    }

    var pushPopup = new Xbox({
        content: '<div id="push-popup">' +
            '' +
            '</div>',
        width: 420
    });

    $document.on('click', '.J-close-form-btn', function () {
        pushPopup.hide()
    })

    var pushPopupTpl = Handlebars.compile($('#push-popup-tpl').val())

    $document.on('submit', 'form.push-popup-form', function (ev) {
        ev.preventDefault()
        /*
         发送信息的接口
         url:https://clive.alipay.com/pushWindow.json
         * query
         * token:ab79eb90cfb54a92aeb9c499082aa133
         visitorId:2088002474745230
         sid:e3b1c3233d834773b5f2b9262ac969dc006
         code:
         stype:2
         language:1
         instanceId:1
         serviceToken:0f1337ae62ab492d819bd4d5d22d211d000
         formData
         pushValues:logonEmail=test%40test.com&reLogonEmail=test%40test.com&msg_id=e5ce8&pushType=SERVER_PUSH&msg_code=PUSH_SERVICE&windowCode=TASK_LOGIN_EMAIL_WINDOW
         windowCode:TASK_LOGIN_EMAIL_WINDOW
         pushType:VISITOR_COMMIT
         _input_charset:utf-8

         fail:
         {"msg":"email已被占用,请重新输入","stat":"fail"}

         success:
         {"msg":"<font color='red'>[系统消息]<\/font>  您已经为修改登录email推送框提供信息","stat":"ok"}

         * */
        console.log($(this).serialize())
    })

    /*发送消息*/
    function sendMessage(content, callback) {

        if (config[content]) {
            /*
             抓取表单配置信息
             https://clive.alipay.com/loadWindow.json?windowCode=TASK_LOGIN_EMAIL_WINDOW&language=1&instanceId=1&serviceToken=0f1337ae62ab492d819bd4d5d22d211d000
             * */
            $.ajax({
                url: 'https://clive.alipay.com/loadWindow.json',
                dataType: 'jsonp',
                jsonp: '_callback',
                cache: false,
                data: {
                    windowCode: config[content],
                    language: 1,
                    instanceId: 1,
                    serviceToken: '1a0831eb51ee42058f66e43078433124000'
                },
                success: function (data) {
                    mid = 'test'
                    data.pushWindow.mid = mid
                    pushPopup.set('content', '<div>' + pushPopupTpl(data.pushWindow) + '</div>')
                    pushPopup.show()
                }
            })

            return
        }


        if ($.trim(content).length < 1) {
            return
        }
        if (!delaySendMessage) {
            delaySendMessage = true

            console.log('发送消息，当前状态：', chatStatus)
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
                    switch (item.cmd) {
                        //客服小休
                        case 'serverBreak':
                            break;
                        //客服离线
                        case 'serverLeave':
                            break;
                        //客服会话超时
                        case 'serverTimeOut':
                            break;
                        //客服下班提醒
                        case 'serverOffLineRemind':
                            break;
                        //会话建立
                        case 'sessionStart':
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
                            }, 1000)
                            break;
                        //会话转接
                        case 'sessionSwitch':
                            chatStatus = 'yunzaixian'
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000)
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
                            console.log('轮询消息,cmd:', item.cmd, '剩余排队人数' + item.count)
                            $content.find('.J-queuing-number').text(item.count)
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000)
                            break;
                        //访客离开
                        case 'userLeave':
                            break;
                        //访客超时提醒
                        case 'userRemind':
                            break;
                        //文本消息
                        case 'text':
                            mid = data.mid
                            chatStatus = 'yunzaixian'
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000)
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
                            mid = data.mid
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000)


                            break;
                        //客服推送登录服务
                        case 'NEED_LOGIN':
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000)
                            break;
                        //访客登录成功
                        case 'LOGIN_SUCCESS':
                            beforeFetchMessageCl = setTimeout(function () {
                                fetchMessage()
                            }, 1000)
                            break;
                        //访客拒绝登录
                        case 'LOGIN_REFUSE':
                            break;
                        //访客登录失败
                        case 'LOGIN_FAIL':
                            break;
                    }

                })
            })
            .error(function () {
                //todo:出错次数超出阈值时取消
                beforeFetchMessageCl = setTimeout(function () {
                    fetchMessage()
                }, 1000)
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
        console.log('隐藏转人工')
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
    $(survey.elements['content']).on('keydown', function (ev) {
        setTimeout(function () {
            countTextareaLeft()
        }, 0)
    })

    function countTextareaLeft() {
        var length = 200 - survey.elements['content'].value.length
        $survey.find('.J-left').text(length)
        if (survey.elements['content'].value.replace(/\s/gmi, '').length < 1) {
            $submitBtn.removeClass('active')
        } else {
            $submitBtn.addClass('active')
        }

    }

    /*当点击服务器返回的list的时候，发送消息出去*/
    $content.on('click', '#output-content li', function (ev) {
        sendMessage($(ev.currentTarget).text())
    })

    /*点击有帮助时，关闭浮层*/
    $('.J-helpful').on('click', function () {
        console.log('点击了有帮助')
        $('#artificial-service').hide()
        console.log('隐藏转人工')
        $contentWrapper.css({bottom: 1})
    })

    /*自动提示*/
    new AutoComplete({
        trigger: survey.elements['content'],
        /*TODO:query有换行会报错*/
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


    //页面打开后，获取URL中的sourceID

    //

    $('#test-port li').on('click', function () {
        sendMessage($(this).text())
    })


})
