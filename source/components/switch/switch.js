(function (Metro, $) {
    "use strict";
    var Utils = Metro.utils;
    var SwitchDefaultConfig = {
        switchDeferred: 0,
        material: false,
        prepend:"",
        append: "",
        clsSwitch: "",
        clsCheck: "",
        clsCaption: "",
        onoff: false,
        on: "",
        off: "",
        showOnOff: false,
        onSwitchCreate: Metro.noop,
    };

    Metro.switchSetup = function (options) {
        SwitchDefaultConfig = $.extend({}, SwitchDefaultConfig, options);
    };

    if (typeof globalThis["metroSwitchSetup"] !== undefined) {
        Metro.switchSetup(globalThis["metroSwitchSetup"]);
    }

    Metro.Component("switch", {
        init: function (options, elem) {
            this._super(elem, options, SwitchDefaultConfig, {});

            return this;
        },

        _create: function () {
            const element = this.element, o = this.options;
            const strings = this.strings;

            const container = element.wrap("<label>").addClass("switch").addClass(element[0].className).addClass(o.clsSwitch);

            element.attr("type", "checkbox");

            if (element.attr("readonly") !== undefined) {
                element.on("click", function (e) {
                    e.preventDefault();
                });
            }

            this.component = container;

            element[0].className = "";

            if (o.prepend) {
                container.prepend($("<span>").addClass("caption-prepend").addClass(o.clsPrepend).addClass(o.clsCaption).html(o.prepend));
            }
            
            if (o.append) {
                container.append($("<span>").addClass("caption-append").addClass(o.clsAppend).addClass(o.clsCaption).html(o.append));
            }
            
            if (o.onoff === true) {
                element.attr("data-on", o.on || strings.label_on);
                element.attr("data-off", o.off || strings.label_off);
            } else {
                element.removeAttr("data-on");
                element.removeAttr("data-off");
            }

            if (o.material === true) {
                container.addClass("material");
            }
            
            this._fireEvent("switch-create");
        },

        toggle: function (v) {
            const element = this.element;

            if (element.is(":disabled")) return this;

            if (!Utils.isValue(v)) {
                element.prop("checked", !Utils.bool(element.prop("checked")));
            } else {
                element.prop("checked", v === 1);
            }

            return this;
        },

        changeAttribute: function (attr, newVal) {},

        destroy: function () {
            return this.element;
        },
    });
})(Metro, Dom);
