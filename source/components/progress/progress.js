/* global Metro */
(function(Metro, $) {
    'use strict';
    var ProgressDefaultConfig = {
        progressDeferred: 0,
        showValue: false,
        showLabel: false,
        label: "Progress:",
        value: 0,
        buffer: 0,
        type: "bar",
        small: false,
        clsProgress: "",
        clsBack: "",
        clsBar: "",
        clsBuffer: "",
        clsValue: "",
        clsLabel: "",
        clsData: "",
        onValueChange: Metro.noop,
        onBufferChange: Metro.noop,
        onComplete: Metro.noop,
        onBuffered: Metro.noop,
        onProgressCreate: Metro.noop
    };

    Metro.progressSetup = function (options) {
        ProgressDefaultConfig = $.extend({}, ProgressDefaultConfig, options);
    };

    if (typeof globalThis["metroProgressSetup"] !== undefined) {
        Metro.progressSetup(globalThis["metroProgressSetup"]);
    }

    Metro.Component('progress', {
        init: function( options, elem ) {
            this._super(elem, options, ProgressDefaultConfig, {
                value: 0,
                buffer: 0
            });

            return this;
        },

        _create: function(){
            var element = this.element, elem = this.elem, o = this.options;

            if (typeof o.type === "string") o.type = o.type.toLowerCase();

            element
                .html("")
                .addClass("progress");

            this.component = element.wrap("<div>").addClass("progress-component").addClass(o.clsProgress);

            function _progress(){
                elem.innerHTML = `<div class="bar"></div>`
            }

            function _buffer(){
                elem.innerHTML = `
                    <div class="bar"></div>
                    <div class="buffer"></div>
                `
            }

            function _load(){
                element.addClass("with-load");
                elem.innerHTML = `
                    <div class="bar"></div>
                    <div class="buffer"></div>
                    <div class="load"></div>
                `
            }

            function _line(){
                element.addClass("line");
            }

            switch (o.type) {
                case "buffer": _buffer(); break;
                case "load": _load(); break;
                case "line": _line(); break;
                default: _progress();
            }

            if (o.small === true) element.addClass("small");

            element.addClass(o.clsBack);
            element.find(".bar").addClass(o.clsBar);
            element.find(".buffer").addClass(o.clsBuffer);

            var data = $("<div>").addClass("progress-data").addClass(o.clsData).insertBefore(element);
            var label = $("<div>").addClass("progress-label").addClass(o.clsLabel).html(o.label).appendTo(data);
            var value = $("<div>").addClass("progress-value").addClass(o.clsLabel).html(o.value).appendTo(data);

            if (o.showLabel === false) { label.hide(); }
            if (o.showValue === false) { value.hide(); }

            this.val(o.value);
            this.buff(o.buffer);

            this._fireEvent("progress-create", {
                element: element
            });
        },

        val: function(v){
            var that = this, element = this.element, o = this.options;
            var value = this.component.find(".progress-value");

            if (v === undefined) {
                return that.value;
            }

            var bar  = element.find(".bar");

            if (bar.length === 0) {
                return false;
            }

            this.value = parseInt(v, 10);

            bar.css("width", this.value + "%");
            value.html(this.value+"%");

            this._fireEvent("value-change", {
                val: this.value
            });

            if (this.value === 100) {

                this._fireEvent("complete", {
                    val: this.value
                });

            }
        },

        buff: function(v){
            var that = this, element = this.element;

            if (v === undefined) {
                return that.buffer;
            }

            var bar  = element.find(".buffer");

            if (bar.length === 0) {
                return false;
            }

            this.buffer = parseInt(v, 10);

            bar.css("width", this.buffer + "%");

            this._fireEvent("buffer-change", {
                val: this.buffer
            });

            if (this.buffer === 100) {
                this._fireEvent("buffered", {
                    val: this.buffer
                });
            }
        },

        changeValue: function(){
            this.val(this.element.attr('data-value'));
        },

        changeBuffer: function(){
            this.buff(this.element.attr('data-buffer'));
        },

        changeAttribute: function(attributeName){
            switch (attributeName) {
                case 'data-value': this.changeValue(); break;
                case 'data-buffer': this.changeBuffer(); break;
            }
        },

        destroy: function(){
            return this.component.remove();
        }
    });
}(Metro, m4q));