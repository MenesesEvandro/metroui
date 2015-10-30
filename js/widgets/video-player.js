$.widget( "metro.video" , {

    version: "3.0.14",

    options: {
        width: '100%',
        videoSize: 'hd', //sd
        controls: true,
        controlsPosition: 'bottom',
        controlsModel: 'full',
        loopButton: "<span class='mif-loop'></span>",
        stopButton: "<span class='mif-stop'></span>",
        playButton: "<span class='mif-play'></span>",
        pauseButton: "<span class='mif-pause'></span>",
        muteButton: "<span class='mif-volume-mute'></span>",

        volumeLowButton: "<span class='mif-volume-low'></span>",
        volumeMediumButton: "<span class='mif-volume-medium'></span>",
        volumeHighButton: "<span class='mif-volume-high'></span>",

        screenMoreButton: "<span class='mif-enlarge'></span>",
        screenLessButton: "<span class='mif-shrink'></span>",
        fullScreenMode: "window",
        poster: false,
        src: false,
        loop: false,
        volume:.5,
        logo: false
    },

    _create: function () {
        var that = this, element = this.element, o = this.options;

        this._setOptionsFromDOM();

        this._createPlayer();

        element.data('video', this);
    },

    _createPlayer: function(){
        var that = this, element = this.element, o = this.options;
        var player_width = element.width(), player_height;
        var controls, video = element.find("video");

        if (o.videoSize == 'HD' && o.videoSize == 'hd') {
            player_height = 9 * player_width / 16;
        } else if (o.videoSize == 'SD' && o.videoSize == 'sd') {
            player_height = 3 * player_width / 4;
        } else {

        }

        element.addClass('video-player');

        element.css({
            height: player_height
        });

        if (video.length == 0) {
            video = $("<video/>").appendTo(element);
        }

        $.each(['autoplay', 'controls', 'height', 'width', 'loop', 'poster', 'preload'], function(){
            video.removeAttr(this);
        });

        if (o.poster) {
            video.attr("poster", o.poster);
        }

        if (o.src) {
            if (o.src.indexOf('youtube') >= 0) {
                var youtube_reg = /v=[(\w)]+/ig;
                var youtube_id = youtube_reg.exec(o.src)[0].substring(2);

            } else {
                video.attr("src", o.src);
            }
        }

        if (o.loop) {
            video.attr("loop", "loop");
        }

        if (o.preload) {
            video.attr("preload", "preload");
        }

        if (o.autoplay) {
            video.attr("autoplay", "autoplay");
        }

        video[0].volume = o.volume;

        this._addControls();
        this._addEvents();

        element.data('fullScreen', false);
        element.data('muted', false);
        element.data('duration', 0);
        element.data('timeInterval', undefined);
        element.data('played', false);

    },

    _addEvents: function(){
        var that = this, element = this.element, element_obj = element[0], o = this.options;
        var controls = element.find('.controls'),
            preloader = element.find('.video-preloader'),
            play_button = controls.find('.play'),
            stop_button = controls.find('.stop'),
            volume_button = controls.find('.volume'),
            screen_button = controls.find('.full'),
            volume_slider = controls.find('.volume-slider'),
            stream_slider = controls.find('.stream-slider'),
            info_box = controls.find('.info-box');
        var video = element.find("video"), video_obj = video[0];

        video.on('loadedmetadata', function(){
            element.data('duration', video_obj.duration.toFixed(0));
            info_box.html("00:00" + " / " + that._timeToString(element.data('duration')) );
        });

        video.on("canplay", function(){
            controls.fadeIn();
            preloader.hide();
            var buffered = video_obj.buffered.length ? Math.round(Math.floor(video_obj.buffered.end(0)) / Math.floor(video_obj.duration) * 100) : 0;
            that._setBufferSize(buffered);
        });

        video.on('progress', function(){
            var buffered = video_obj.buffered.length ? Math.round(Math.floor(video_obj.buffered.end(0)) / Math.floor(video_obj.duration) * 100) : 0;
            that._setBufferSize(buffered);
        });

        video.on("timeupdate", function(){
            that._setInfoData();
            that._setStreamSliderPosition();
        });

        video.on("waiting", function(){
            preloader.show();
        });

        video.on("loadeddata", function(){
            preloader.hide();
        });

        video.on('ended', function(){
            that._stopVideo();
        });

    },

    _timeToString: function(time){
        var hours, minutes, seconds;

        hours = parseInt( time / 3600 ) % 24;
        minutes = parseInt( time / 60 ) % 60;
        seconds = time % 60;

        return (hours ? (hours) + ":" : "") + (minutes < 10 ? "0"+minutes : minutes) + ":" + (seconds < 10 ? "0"+seconds : seconds);
    },

    _setInfoData: function(){
        var that = this, element = this.element, element_obj = element[0], o = this.options;
        var video = element.find("video"), video_obj = video[0];
        var info_box = element.find(".controls .info-box");
        var currentTime = Math.round(video_obj.currentTime);

        info_box.html(this._timeToString(currentTime) + " / " + this._timeToString(element.data('duration')));
    },

    _setStreamSliderPosition: function(){
        var that = this, element = this.element, element_obj = element[0], o = this.options;
        var video = element.find("video"), video_obj = video[0];
        var slider = element.find(".stream-slider").data("slider");
        slider.value(Math.round(video_obj.currentTime * 100 / element.data('duration')));
    },

    _setBufferSize: function(value){
        var that = this, element = this.element, element_obj = element[0], o = this.options;
        var video = element.find("video"), video_obj = video[0];
        var slider = element.find(".stream-slider").data("slider");
        slider.buffer(Math.round(value));
    },

    _stopVideo: function(){
        var that = this, element = this.element, element_obj = element[0], o = this.options;
        var video = element.find("video"), video_obj = video[0];
        var stop_button = element.find(".controls .stop");
        var play_button = element.find(".controls .play");

        video_obj.pause();
        video_obj.currentTime = 0;
        play_button.html(o.playButton);
        stop_button.attr("disabled", "disabled");
        element.data('played', false);
        element.find(".stream-slider").data('slider').value(0);
    },

    _playVideo: function(){
        var that = this, element = this.element, element_obj = element[0], o = this.options;
        var video = element.find("video"), video_obj = video[0];
        var play_button = element.find(".controls .play");
        var stop_button = element.find(".controls .stop");

        if (video_obj.paused) {
            play_button.html(o.pauseButton);
            video_obj.play();
            stop_button.removeAttr("disabled");
            element.data('played', true);
        } else {
            play_button.html(o.playButton);
            video_obj.pause();
            element.data('played', false);
        }
    },

    _addControls: function(){
        var that = this, element = this.element, element_obj = element[0], o = this.options;
        var preloader, logo, controls, loop_button, play_button, stop_button, volume_button, screen_button, volume_slider, stream_slider, info_box, volume_slider_wrapper, stream_slider_wrapper;
        var video = element.find("video"), video_obj = video[0];


        if (o.logo) {
            logo = $("<img/>").addClass('video-logo').appendTo(element);
            logo.attr("src", o.logo);
        }

        preloader = $("<div/>").addClass("video-preloader")
            .attr("data-role", "preloader")
            .attr("data-type", "cycle")
            .attr("data-style", "color")
            .appendTo(element);

        controls = $("<div/>").addClass("controls").appendTo(element);
        controls.addClass('position-'+o.controlsPosition);

        stream_slider_wrapper = $("<div/>").addClass('stream-slider-wrapper').appendTo(controls);
        stream_slider = $("<div/>").addClass('slider stream-slider').appendTo(stream_slider_wrapper);
        stream_slider.slider({
            showHint: true,
            animate: false,
            markerColor: 'bg-red',
            completeColor: 'bg-cyan',
            onStartChange: function(){
                video_obj.pause();
            },
            onChanged: function(value, slider){
                if (video_obj.seekable.length > 0)
                    video_obj.currentTime = (element.data('duration') * value / 100).toFixed(0);

                if (element.data('played') && video_obj.currentTime > 0)
                    video_obj.play();
            }
        });
        stream_slider.data('slider').value(0);

        loop_button = $("<button/>").addClass("square-button small-button1 control-button loop").html(o.loopButton).appendTo(controls);
        loop_button.on("click", function(){
            loop_button.toggleClass('active');
            if (loop_button.hasClass('active')) {
                video.attr("loop", "loop");
            } else {
                video.removeAttr("loop");
            }
        });

        play_button = $("<button/>").addClass("square-button small-button1 control-button play").html(o.playButton).appendTo(controls);
        play_button.on("click", function(){
            that._playVideo();
        });

        stop_button = $("<button/>").addClass("square-button small-button1 control-button stop").html(o.stopButton).appendTo(controls).attr("disabled", "disabled");
        stop_button.on("click", function(){
            that._stopVideo();
        });

        info_box = $("<div/>").addClass('info-box').appendTo(controls);
        info_box.html("00:00 / 00:00");

        screen_button = $("<button/>").addClass("square-button small-button1 control-button full").html(o.screenMoreButton).appendTo(controls);
        screen_button.on("click", function(){
            element.data('fullScreen', !element.data('fullScreen'));

            if (element.data('fullScreen')) {
                screen_button.html(o.screenLessButton);
            } else {
                screen_button.html(o.screenMoreButton);
            }

            if (o.fullScreenMode === 'window') {
                element.toggleClass("full-screen");
            } else {
                if (element.data('fullScreen')) {

                    $(document).on("keyup.metro_video_player", function(e){
                        if (e.keyCode == 27) {
                            screen_button.html(o.screenMoreButton);
                            element.data('fullScreen', false);
                        }
                    });

                    if (element_obj.requestFullscreen) {
                        element_obj.requestFullscreen();
                    } else if (element_obj.msRequestFullscreen) {
                        element_obj.msRequestFullscreen();
                    } else if (element_obj.mozRequestFullScreen) {
                        element_obj.mozRequestFullScreen();
                    } else if (element_obj.webkitRequestFullscreen) {
                        element_obj.webkitRequestFullscreen();
                    }
                } else {

                    $(document).off("keyup.metro_video_player");

                    if(document.exitFullscreen) {
                        document.exitFullscreen();
                    } else if(document.mozCancelFullScreen) {
                        document.mozCancelFullScreen();
                    } else if(document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                }
            }
        });

        volume_slider_wrapper = $("<div/>").addClass('control-slider volume-slider-wrapper place-right').appendTo(controls);
        volume_slider = $("<div/>").addClass('slider volume-slider').appendTo(volume_slider_wrapper);
        volume_slider.slider({
            showHint: true,
            animate: false,
            markerColor: 'bg-red',
            completeColor: 'bg-green',
            onChange: function(value, slider){
                video_obj.volume = value/100;
                that._setupVolumeButton();
            }
        });
        volume_slider.data('slider').value(video_obj.volume * 100);

        volume_button = $("<button/>").addClass("square-button small-button1 control-button volume place-right").html(o.volumeLowButton).appendTo(controls);
        volume_button.on("click", function(){
            element.data('muted', !element.data('muted'));

            video_obj.muted = element.data('muted');

            if (element.data('muted')) {
                volume_button.html(o.muteButton);
            } else {
                that._setupVolumeButton();
            }
        });
        this._setupVolumeButton();

        controls.hide();
    },

    _setupVolumeButton: function(){
        var that = this, element = this.element, o = this.options;
        var video = element.find("video"), video_obj = video[0];
        var controls = element.find('.controls'), volume_button = controls.find('.volume');

        var current_volume = video_obj.volume;
        if (current_volume > 0 && current_volume < 0.3) {
            volume_button.html(o.volumeLowButton);
        } else if (current_volume >= 0.3 && current_volume < 0.6) {
            volume_button.html(o.volumeMediumButton);
        } else if (current_volume >= 0.6 && current_volume <= 1) {
            volume_button.html(o.volumeHighButton);
        } else {
            volume_button.html(o.muteButton);
        }
    },

    _setOptionsFromDOM: function(){
        var that = this, element = this.element, o = this.options;

        $.each(element.data(), function(key, value){
            if (key in o) {
                try {
                    o[key] = $.parseJSON(value);
                } catch (e) {
                    o[key] = value;
                }
            }
        });
    },

    _destroy: function () {
    },

    _setOption: function ( key, value ) {
        this._super('_setOption', key, value);
    }
});
