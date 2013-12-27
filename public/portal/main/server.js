/**
 * 对话消息发送模块
 * 所有的【对话消息】都通过此接口进行发送，不包括心跳包
 */

define(function (require, exports, module) {


    var tpl = '<div class="server">' +
        '<h2>' +
        '<span class="header">' +
        '<b class="nick">{{nick}}</b>' +
        '<b class="time">{{time}}</b>' +
        '</span>' +
        '<a class="avatar"><img src="{{avatarUrl}}"></a>' +
        '</h2>' +
        '<div class="content">' +
        '{{content}}' +
        '</div>' +
        '</div>'

    /*
     * 发送消息
     * */
    exports.send = function (url, type, data, callback) {

        $.ajax({
            url: url,
            type: type,
            data: data
        }).done(function (data) {
                callback(data)
            })

    }

    setInterval(function () {
        exports.send('/mobile/similarQuestions.json', 'get', {}, function () {

        })
    }, 3000)

})