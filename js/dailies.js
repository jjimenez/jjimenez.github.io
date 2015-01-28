/**
 * Created by jjimenez on 1/26/15.
 */


var config = {
    ctx: null,
    canvasWidth: 200,
    canvasHeight: 200,
    circleX: 100,
    circleY: 100,
    circleRadius: 90,
    transparency: 0.75,
    pulseCount: 0,
    arcCount: 0,
    baseColor: "white",
    timerColors: [ "blue", "yellow", "green", "purple"],
    pulseColor: "#ffefdb",
    randomColor: function () {
        return '#' + Math.floor(Math.random() * 16777215).toString(16);
    },
    drawCircle: function (ctx, centerX, centerY, radius, fillStyle) {
        var saveStyle = ctx.fillStyle;
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        ctx.fill();
        ctx.fillStyle = saveStyle;
    },
    alternateCircle: function (ctx,colors, idx) {
        config.drawCircle(ctx, config.circleX, config.circleY, config.circleRadius, colors[idx]);
    },
    drawArc: function (ctx) {
        var saveStyle = ctx.fillStyle;
        var quarter = Math.floor(config.arcCount / 10);
        var startAngle = 20 * Math.PI / 40 * quarter;
        var endAngle = 2 * Math.PI / 40 * config.arcCount;
        config.ctx.fillStyle = config.timerColors[quarter];

        ctx.beginPath();
        ctx.arc(config.circleX, config.circleY, config.circleRadius, startAngle, endAngle, false);
        ctx.fill();
        ctx.fillStyle = saveStyle;
    },
    pulseCircle: function() {
        if (config.pulseCount < 20){
            config.pulseCount++;
            config.alternateCircle(config.ctx,[config.baseColor, config.pulseColor], config.pulseCount % 2);
            setTimeout(config.pulseCircle, 100);
        }
        else {
            config.pulseCount = 0;
            config.clearCanvas();
        }
    },
    clearCanvas: function () {
        config.ctx.clearRect ( 0 , 0 , config.canvasWidth, config.canvasHeight );
    },
    drawNextSegment: function () {
        if (config.arcCount < 40) {
            config.arcCount++;
            config.drawArc(config.ctx);
            setTimeout(config.drawNextSegment, 3000);
        }
        else {
            config.arcCount = 0;
            config.clearCanvas();
        }
    },
    startTimer: function () {
        setTimeout(config.startTimer, 2.05*60*1000);
        config.pulseCircle();
        config.drawNextSegment();
    },
    showWeather: function () {
        $('weather a').src = "http://weathersticker.wunderground.com/weathersticker/cgi-bin/banner/ban/wxBanner?bannertype=wu_clean2day_cond&airportcode=KIOW&ForcedCity=Iowa City&ForcedState=IA&zip=52245&language=EN";
    },
    showNews: function () {
        $('#news').rssfeed('https://news.google.com/news?output=rss',{limit:20, header: false, ssl: true, linktarget: "_blank"}, function(e) {
            $(e).find('div.rssBody').vTicker({ showItems: 2});
        });
    },
    showOthers: function() {
        config.showWeather();
        config.showNews();
        setTimeout(config.showOthers, 20*60*1000);
    }

};






$(document).ready(function () {
    config.ctx = $("#myCanvas").get()[0].getContext("2d");
    config.clearCanvas();
    config.ctx.globalAlpha = config.transparency;       // sets the transparency level of the drawings.
    config.startTimer();
    config.showOthers();
});