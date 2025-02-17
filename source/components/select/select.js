(function (Metro, $) {
    "use strict";

    let SelectDefaultConfig = {
        id: "",
        label: "",
        size: "normal",
        selectDeferred: 0,
        clearButton: false,
        clearButtonIcon: "❌",
        usePlaceholder: false,
        placeholder: "",
        addEmptyValue: false,
        emptyValue: "",
        duration: 0,
        prepend: "",
        append: "",
        filterPlaceholder: "",
        filter: false,
        dropHeight: 200,
        dropWidth: null,
        dropFullSize: false,
        openMode: "auto",
        showGroupName: false,
        shortTag: true, // tag with name max width 120px

        source: null,
        sourceMethod: "GET",

        fetchOnType: false,
        minFetchLength: 3,
        debounceTime: 300,

        clsSelect: "",
        clsSelectInput: "",
        clsPrepend: "",
        clsAppend: "",
        clsOption: "",
        clsOptionActive: "",
        clsOptionGroup: "",
        clsDropList: "",
        clsDropContainer: "",
        clsSelectedItem: "",
        clsSelectedItemAction: "",
        clsLabel: "",
        clsGroupName: "",
        clsFilterInput: "",

        onClear: Metro.noop,
        onChange: Metro.noop,
        onUp: Metro.noop,
        onDrop: Metro.noop,
        onItemSelect: Metro.noop,
        onItemDeselect: Metro.noop,
        onSelectCreate: Metro.noop,
    };

    Metro.selectSetup = function (options) {
        SelectDefaultConfig = $.extend({}, SelectDefaultConfig, options);
    };

    if (typeof globalThis["metroSelectSetup"] !== undefined) {
        Metro.selectSetup(globalThis["metroSelectSetup"]);
    }
    Metro.Component("select", {
        init: function (options, elem) {            
            this._super(elem, options, SelectDefaultConfig, {
                list: null,
                placeholder: null,
                observer: null,
                isLoadingData: false,
                allData: null,
            });

            return this;
        },

        _create: function () {
            const element = this.element;

            this._createSelect();
            this._setOptionsFromDOM();
            this._createEvents();

            this._fireEvent("select-create", {
                element: element,
            });
        },

        _setPlaceholder: function () {
            const element = this.element,
                o = this.options;
            const input = element.siblings(".select-input");
            if (
                o.usePlaceholder === true &&
                (!Metro.utils.isValue(element.val()) || element.val() == o.emptyValue) // == important
            ) {
                input.html(o.placeholder || this.strings.label_select_more);
            }
        },
        _addTag: function (val, data) {
            const element = this.element,
                o = this.options;
            let tag,
                tagSize,
                container = element.closest(".select");
            let html = "<span class='title'>" + val + "</span>";

            tag = $("<div>")
                .addClass("tag")
                .addClass(o.shortTag ? "short-tag" : "")
                .addClass(o.clsSelectedItem)
                .html(html)
                .data("option", data);
            
            $("<span>")
                .addClass("action unselect-option")
                .addClass(o.clsSelectedItemAction)
                .html("&times;")
                .appendTo(tag);

            if (container.hasClass("input-large")) {
                tagSize = "large";
            } else if (container.hasClass("input-small")) {
                tagSize = "small";
            }

            tag.addClass(tagSize);

            return tag;
        },
        _addOption: function(item, parent, input, multiple, group) {
            const option = $(item);
            let l, a;
            const element = this.element,
                o = this.options;
            let html = option.text();
            const displayValue = option.attr("data-display");
        
            // Check if item.val is function
            const itemValue = typeof option.val === "function" ? option.val() : option.attr("value");
        
            l = $("<li>")
                .addClass(o.clsOption)
                .data("option", item)
                .attr("data-text", option.text())
                .attr("data-value", itemValue);
        
            a = $("<a>").html(html);
        
            const optionIcon = option.attr("data-icon");
            if (optionIcon) {
                a.prepend($("<span>").addClass("icon").html(optionIcon));
            }
        
            if (displayValue) {
                l.attr("data-display", displayValue);
                html = displayValue;
            }
        
            l.addClass(option.attr("class"));
        
            l.data("group", group);
        
            if (option.is(":disabled")) {
                l.addClass("disabled");
            }
        
            if (option.is(":selected")) {
                let g = "";
        
                if (o.showGroupName && group) {
                    g = `&nbsp;<span class='selected-item__group-name ${o.clsGroupName}'>${group}</span>`;
                }
        
                if (multiple) {
                    l.addClass("d-none");
                    input.append(this._addTag(a.html() + g, l));
                } else {
                    html = a.html() + g;
                    element.val(itemValue);
                    input.html(html);
                    element.trigger("change", {
                        val: itemValue,
                    });
                    l.addClass("active");
                }
            }
        
            l.append(a).appendTo(parent);
        },        
        _addOptionGroup: function (item, parent, input, multiple) {
            const that = this,
                o = this.options;
            const group = $(item);

            $("<li>")
                .html(item.label)
                .addClass("group-title")
                .addClass(o.clsOptionGroup)
                .appendTo(parent);

            $.each(group.children(), function () {
                that._addOption(this, parent, input, multiple, item.label);
            });
        },

        _createOptions: function () {
            const that = this,
                element = this.element,
                o = this.options,
                select = element.parent();
            const list = select.find("ul").empty();
            const selected = element.find("option[selected]").length > 0;
            const multiple = element[0].multiple;
            const input = element.siblings(".select-input");
            
            element.siblings(".select-input").empty();

            if (o.addEmptyValue === true) {
                element.prepend(
                    $(
                        "<option " +
                            (!selected ? "selected" : "") +
                            " value='" +
                            o.emptyValue +
                            "' class='d-none'></option>",
                    ),
                );
            }

            $.each(element.children(), function () {
                if (this.tagName === "OPTION") {
                    that._addOption(this, list, input, multiple, null);
                } else if (this.tagName === "OPTGROUP") {
                    that._addOptionGroup(this, list, input, multiple);
                }
            });
        },

        _createSelect: async function () {
            const that = this,
                element = this.element,
                o = this.options;
        
            const container = element.wrap("<label>");
            const multiple = element[0].multiple;
            const select_id = Metro.utils.elementId("select");
            const buttons = $("<div>").addClass("button-group");
            let input,
                drop_container,
                drop_container_input,
                list,
                filter_input,
                dropdown_toggle;
            const checkboxID = Metro.utils.elementId("select-focus-trigger");
            const checkbox = $("<input type='checkbox'>")
                .addClass("select-focus-trigger")
                .attr("id", checkboxID);
        
            this.placeholder = $("<span>")
                .addClass("placeholder")
                .html(o.placeholder);
        
            container
                .attr("id", o.id ? o.id : select_id)
                .attr("for", checkboxID);
            container[0].className = Metro.utils.classNames(
                element[0].className,
                "input-" + o.size,
                "select",
                o.clsSelect,
            );
        
            dropdown_toggle = $("<span>").addClass("dropdown-toggle");
            dropdown_toggle.appendTo(container);
        
            if (multiple) {
                container.addClass("multiple");
            }
        
            buttons.appendTo(container);
            checkbox.appendTo(container);
        
            input = $("<div>")
                .addClass("select-input")
                .addClass(o.clsSelectInput)
                .attr("name", "__" + select_id + "__");
            drop_container = $("<div>")
                .addClass("drop-container")
                .addClass(o.clsDropContainer);
        
            if (o.dropFullSize === false) {
                if (o.dropWidth) {
                    drop_container.css({
                        width: +o.dropWidth,
                    });
                }
            } else {
                container.addClass("drop-full-size");
            }
        
            drop_container_input = $("<div>").appendTo(drop_container);
            list = $("<ul>")
                .addClass("option-list")
                .addClass(o.clsDropList)
                .css({
                    "max-height": o.dropHeight,
                });
                filter_input = $(
                    `<input type='text' data-role='input' data-clear-button-icon="${o.clearButtonIcon}">`,
                )
                    .attr("placeholder", o.filterPlaceholder || this.strings.label_filter + "...")
                    .appendTo(drop_container_input);
            
                this.filter_input = filter_input;
            
                filter_input.addClass(o.clsFilterInput);
            
                container.append(input);
                container.append(drop_container);
            
                drop_container.append(drop_container_input);
            
                if (o.filter !== true) {
                    drop_container_input.hide();
                }
            
                drop_container.append(list);
            
                if (o.source && !o.fetchOnType) { // Initial fetch only if is not fetchOnType - Uses native function
                    await this.fetch(o.source, {
                        method: o.sourceMethod || "GET",
                    });
                    this._createOptions();
                }
            
                this._setPlaceholder();
            
                this._createDroppable(drop_container);
            
                this.list = list;
            
                if (o.clearButton === true && !element[0].readOnly) {
                    const clearButton = $("<button>")
                        .addClass("button input-clear-button")
                        .addClass(o.clsClearButton)
                        .attr("tabindex", -1)
                        .attr("type", "button")
                        .html(o.clearButtonIcon);
                    clearButton.appendTo(buttons);
                } else {
                    buttons.addClass("d-none");
                }
                if (o.prepend !== "" && !multiple) {
                    const prepend = $("<div>").html(o.prepend);
                    prepend
                        .addClass("prepend")
                        .addClass(o.clsPrepend)
                        .appendTo(container);
                }
            
                if (o.append !== "" && !multiple) {
                    const append = $("<div>").html(o.append);
                    append
                        .addClass("append")
                        .addClass(o.clsAppend)
                        .appendTo(container);
                }
            
                if (element.attr("dir") === "rtl") {
                    container.addClass("rtl").attr("dir", "rtl");
                }
            
                if (o.label) {
                    const label = $("<label>")
                        .addClass("label-for-input")
                        .addClass(o.clsLabel)
                        .html(o.label)
                        .insertBefore(container);
                    if (element.attr("id")) {
                        label.attr("for", element.attr("id"));
                    }
                    if (element.attr("dir") === "rtl") {
                        label.addClass("rtl");
                    }
                }
            
                if (element.is(":disabled")) {
                    this.disable();
                } else {
                    this.enable();
                }
            
                this.observer = new MutationObserver(this._updateSelect.bind(this));
                this.observer.observe(element[0], {
                    childList: true,
                    subtree: true,
                });
            },
            _createDroppable: function (drop_container) {
                const that = this, o = this.options;
                const filter_input = drop_container.find("input");
                const dropdown_toggle = drop_container.siblings(".dropdown-toggle");
                const container = this.element.closest(".select");
                const list = drop_container.find("ul");
                
                Metro.makePlugin(drop_container, "dropdown", {
                    dropFilter: ".select",
                    duration: o.duration,
                    toggleElement: [container],
                    openMode: o.openMode,
                    onDrop: function () {
                        let dropped, target;
                        dropdown_toggle.addClass("active-toggle");
                        dropped = $(".select .drop-container");
                        $.each(dropped, function () {
                            const drop = $(this);
                            if (drop.is(drop_container)) {
                                return;
                            }
                            const dataDrop = Metro.getPlugin(drop, "dropdown");
                            if (dataDrop && dataDrop.close) {
                                dataDrop.close();
                            }
                        });
    
                        filter_input.val("").trigger(Metro.events.keyup); //.focus();
    
                        target =
                            list.find("li.active").length > 0
                                ? $(list.find("li.active")[0])
                                : undefined;
                        if (target !== undefined) {
                            list[0].scrollTop =
                                target.position().top -
                                (list.height() - target.height()) / 2;
                        }
    
                        that._fireEvent("drop", {
                            list: list[0],
                        });
                    },
                    onUp: function () {
                        dropdown_toggle.removeClass("active-toggle");
    
                        that._fireEvent("up", {
                            list: list[0],
                        });
                    },
                });
            },
            
            _updateSelect: function (mutation) {
                for (let record of mutation) {
                    if (record.type === "childList") {
                        if (
                            record.addedNodes.length ||
                            record.removedNodes.length
                        ) {
                            this._createOptions();
                        }
                    }
                }
            },
            _setOptionsFromDOM: function() {
                const element = this.element, o = this.options;
            
                $.each(element.data(), function(key, value) {
                    o[key] = value;
                });
            },
    
            _onInputChange: function() {
                var that = this, o = this.options;
                var filter = this.filter_input.val().trim();
            
                clearTimeout(this.typingTimer);
            
                if (o.fetchOnType) {
                    if (filter.length >= o.minFetchLength) {
                        this.typingTimer = setTimeout(function() {
                            that._fetchData(filter);
                        }, o.debounceTime);
                    } 
                } else if (o.filter) {
                    that._filterOptions(filter);
                }
            },
            
            _fetchData: async function(query) {
                const that = this;
                const element = this.element;
                const source = element.data("source");
                const params = new URLSearchParams({ search: query });
                const url = `${source}?${params.toString()}`;
            
                const selectedValues = that.getSelected(); // Get selected values
            
                try {
                    // Loading is ON
                    that.isLoadingData = true;
            
                    //Fetch data
                    const result = await fetch(url, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                    });
            
                    if (!result.ok) {
                        console.error(Metro.locales[this.locale].label_error_load_message);
                        return;
                    }
            
                    const data = await result.json();
            
                    // Salve all data
                    that.allData = data;
            
                    // Apply filter and Update Options
                    that._filterAndUpdateOptions(query);
            
                    // After filter, verify if should return previous selected item
                    // Check if the selected value is still in the filtered list
                    const validSelection = selectedValues.filter(val => {
                        return that.allData.some(item => item.value === val);  // Checks whether the value still exists in the data
                    });
            
                    if (validSelection.length > 0) {
                        // If the selected value exists, restore the selection
                        that.val(validSelection);
                    } 
            
                } catch (error) {
                    console.error(Metro.locales[this.locale].label_error + ": ", error);
                } finally {
                    // Ensure loading is complete
                    that.isLoadingData = false;
                }
            },
                
            _filterAndUpdateOptions: function(query) {
                const that = this;

                // If the query is empty, display all data and restore the selection
                if (query.trim() === "") {
                    that._updateOptions(that.allData);
                    // Restores selected items
                    const selectedValues = that.getSelected();
                    if (selectedValues.length > 0) {
                        that.val(selectedValues);
                    }
                    return;
                }
                
                // Filter the data according to the query entered
                let filteredData = this.allData.filter(function(item) {
                    return item.text.toLowerCase().includes(query.toLowerCase());
                });
                
                // Gets the currently selected values
                const selectedValues = that.getSelected();
                
                // Get the complete items that are selected
                let selectedItems = this.allData.filter(function(item) {
                    return selectedValues.indexOf(item.value) !== -1;
                });
                
                // Merges filtered items with selected items (avoiding duplicates)
                let mergedData = filteredData.slice();
                selectedItems.forEach(function(item) {
                    if (!mergedData.some(i => i.value === item.value)) {
                        mergedData.push(item);
                    }
                });

                that._updateOptions(mergedData);
            },
                        
            _updateOptions: function(data) {
                var that = this, element = this.element;
                        
                that._clearOptions();
            
                $.each(data, function(index, item) {
                    var option = $("<option>").attr("value", item.value).text(item.text);
                    element.append(option);
                });
            
                that._createOptions();
            
                element.val("");
                element.change();
            },
    
            _clearOptions: function() {
                var element = this.element;
                element.find('option').remove();
            },
    
            _filterOptions: function(filter) {
                var options = this.element.find('option');
    
                options.each(function() {
                    var option = $(this);
                    var text = option.text().toLowerCase();
    
                    if (text.indexOf(filter.toLowerCase()) === -1) {
                        option.hide();
                    } else {
                        option.show();
                    }
                });
            },
    
            _showMessage: function() {
                var list = this.list;
                var o = this.options;

                this._hideInfo();

                list.append("<div class='option-list-info'>" + Metro.locales[this.locale].label_to_short.replace("$1", o.minFetchLength) + "</div>");
            },

            _showLoader: function() {
                // ToDo: Implement loading message
            },

            _showError: function(message) {
                // ToDo: Implement error message (if necessary)
                console.error(message);
            },
    
            _hideInfo: function() {
                const that = this,
                    element = this.element,
                    list = this.list,
                    o = this.options;
            
                const container = element.closest(".select");
                const drop_container = container.find(".drop-container");

                if (o.source && o.fetchOnType) { // Only clears the options if it is fetchOnType
                    drop_container.find("li").remove();
                }
                
                list.find(".option-list-info").remove();
            },

            _createEvents: function () {
                const that = this,
                    element = this.element,
                    o = this.options;
                const container = element.closest(".select");
                const drop_container = container.find(".drop-container");
                const input = element.siblings(".select-input");
                const filter_input = drop_container.find("input");
                const list = drop_container.find("ul");
                const clearButton = container.find(".input-clear-button");
                const checkbox = container.find(".select-focus-trigger");
            
                if (o.fetchOnType || o.filter) {
                    filter_input.on("input", function() {
                        that._onInputChange();
                    });
                }
            
                checkbox.on("focus", function () {
                    container.addClass("focused");
                });
    
                checkbox.on("blur", function () {
                    container.removeClass("focused");
                });
    
                clearButton.on(Metro.events.click, function (e) {
                    element.val(o.emptyValue);
                    if (element[0].multiple) {
                        list.find("li").removeClass("d-none");
                    }
    
                    input.clear();
                    that._setPlaceholder();
    
                    e.preventDefault();
                    e.stopPropagation();
    
                    that._fireEvent("clear");
                    that._fireEvent("change", {
                        selected: that.getSelected(),
                    });
                });
    
                element.on(Metro.events.change, function () {
                    that._setPlaceholder();
                });
    
                container.on(Metro.events.click, function () {
                    $(".focused").removeClass("focused");
                    container.addClass("focused");
                });
    
                input.on(Metro.events.click, function () {
                    $(".focused").removeClass("focused");
                    container.addClass("focused");
                });
    
                list.on(Metro.events.click, "li", function (e) {
                    if ($(this).hasClass("group-title")) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                    }
                    const leaf = $(this);
                    const displayValue = leaf.attr("data-display");
                    const val = leaf.data("value");
                    const group = leaf.data("group");
                    let html = displayValue
                        ? displayValue
                        : leaf.children("a").html();
                    let selected;
                    const option = leaf.data("option");
                    const options = element.find("option");
    
                    if (o.showGroupName && group) {
                        html +=
                            "&nbsp;<span class='selected-item__group-name " +
                            o.clsGroupName +
                            "'>" +
                            group +
                            "</span>";
                    }
    
                    if (element[0].multiple) {
                        leaf.addClass("d-none");
                        input.append(that._addTag(html, leaf));
                    } else {
                        list.find("li.active")
                            .removeClass("active")
                            .removeClass(o.clsOptionActive);
                        leaf.addClass("active").addClass(o.clsOptionActive);
                        input.html(html);
                        Metro.getPlugin(drop_container, "dropdown").close();
                    }
    
                    $.each(options, function () {
                        if (this === option) {
                            this.selected = true;
                        }
                    });
    
                    that._fireEvent("item-select", {
                        val: val,
                        option: option,
                        leaf: leaf[0],
                    });
    
                    selected = that.getSelected();
    
                    that._fireEvent("change", {
                        selected: selected,
                    });
                });
                input.on("click", ".tag .action", function (e) {
                    const item = $(this).closest(".tag");
                    const leaf = item.data("option");
                    const option = leaf.data("option");
                    let selected;
    
                    leaf.removeClass("d-none");
                    $.each(element.find("option"), function () {
                        if (this === option) {
                            this.selected = false;
                        }
                    });
                    item.remove();
    
                    that._fireEvent("item-deselect", {
                        option: option,
                    });
    
                    selected = that.getSelected();
    
                    that._fireEvent("change", {
                        selected: selected,
                    });
    
                    e.preventDefault();
                    e.stopPropagation();
                });
    
                filter_input.on(Metro.events.keyup, function () {
                    const filter = this.value.toUpperCase();
                    const li = list.find("li");
                    if (filter.length < o.minFetchLength) {
                        that._showMessage();
                    } else {
                        that._hideInfo();
                        let i, a;
                        for (i = 0; i < li.length; i++) {
                            if ($(li[i]).hasClass("group-title")) continue;
                            a = li[i].getElementsByTagName("a")[0];
                            if (a.innerHTML.toUpperCase().indexOf(filter) > -1) {
                                li[i].style.display = "";
                            } else {
                                li[i].style.display = "none";
                            }
                        }
                    }
                    
                });
    
                filter_input.on(Metro.events.click, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
    
                drop_container.on(Metro.events.click, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            },
    
            disable: function () {
                this.element.data("disabled", true);
                this.element.closest(".select").addClass("disabled");
            },
    
            enable: function () {
                this.element.data("disabled", false);
                this.element.closest(".select").removeClass("disabled");
            },
    
            toggleState: function () {
                if (this.elem.disabled) {
                    this.disable();
                } else {
                    this.enable();
                }
            },
    
            reset: function (to_default) {
                const element = this.element;
                const options = element.find("option");
                const select = element.closest(".select");
                let selected;
    
                $.each(options, function () {
                    this.selected = !Metro.utils.isNull(to_default)
                        ? this.defaultSelected
                        : false;
                });
    
                this.list.find("li").remove();
                select.find(".select-input").html("");
    
                this._createOptions();
    
                selected = this.getSelected();
    
                this._fireEvent("change", {
                    selected: selected,
                });
            },
            getSelected: function () {
                const element = this.element;
                const result = [];
    
                element.find("option").each(function () {
                    if (this.selected) result.push(this.value);
                });
    
                return result;
            },
    
            val: function (val) {
                const that = this,
                    element = this.element,
                    o = this.options;
                const input = element.siblings(".select-input");
                const options = element.find("option");
                const list_items = this.list.find("li");
                const result = [];
                const multiple = element.attr("multiple") !== undefined;
                let option;
                let i, html, list_item, option_value, selected, group;
    
                if (Metro.utils.isNull(val)) {
                    $.each(options, function () {
                        if (this.selected) result.push(this.value);
                    });
                    return multiple ? result : result[0];
                }
    
                $.each(options, function () {
                    this.selected = false;
                });
                list_items.removeClass("active").removeClass(o.clsOptionActive);
                input.html("");
    
                if (Array.isArray(val) === false) {
                    val = [val];
                }
    
                $.each(val, function () {
                    for (i = 0; i < options.length; i++) {
                        option = options[i];
                        html = Metro.utils.isValue(option.getAttribute("data-template"))
                            ? option
                                  .getAttribute("data-template")
                                  .replace("$1", option.text)
                            : option.text;
                        if ("" + option.value === "" + this) {
                            option.selected = true;
                            break;
                        }
                    }
    
                    for (i = 0; i < list_items.length; i++) {
                        list_item = $(list_items[i]);
                        group = list_item.data("group");
                        option_value = list_item.attr("data-value");
                        if ("" + option_value === "" + this) {
                            if (o.showGroupName && group) {
                                html +=
                                    "&nbsp;<span class='selected-item__group-name'>" +
                                    group +
                                    "</span>";
                            }
    
                            if (multiple) {
                                list_item.addClass("d-none");
                                input.append(that._addTag(html, list_item));
                            } else {
                                list_item
                                    .addClass("active")
                                    .addClass(o.clsOptionActive);
                                input.html(html);
                            }
                            break;
                        }
                    }
                });
    
                selected = this.getSelected();
    
                this._fireEvent("change", {
                    selected: selected,
                });
            },
    
            options: function (op, selected, delimiter) {
                return this.data(op, selected, delimiter);
            },
    
            data: function (op, selected, delimiter) {
                const element = this.element;
                let option_group, _selected;
                const _delimiter = delimiter || ",";
    
                if (typeof selected === "string") {
                    _selected = selected.toArray(_delimiter).map(function (v) {
                        return isNaN(v) ? v : +v;
                    });
                } else if (Array.isArray(selected)) {
                    _selected = selected.slice().map(function (v) {
                        return isNaN(v) ? v : +v;
                    });
                } else {
                    _selected = [];
                }
    
                this.observer.disconnect();
                element.empty();
    
                if (typeof op === "string") {
                    element.html(op);
                } else if (Metro.utils.isObject2(op)) {
                    $.each(op, function (key, val) {
                        if (Metro.utils.isObject2(val)) {
                            option_group = $("<optgroup label=''>")
                                .attr("label", key)
                                .appendTo(element);
                            $.each(val, function (key2, val2) {
                                const op = $("<option>")
                                    .attr("value", key2)
                                    .text(val2)
                                    .appendTo(option_group);
                                if (_selected.indexOf(+key2) > -1) {
                                    op.prop("selected", true);
                                }
                            });
                        } else {
                            const op = $("<option>")
                                .attr("value", key)
                                .text(val)
                                .appendTo(element);
                            if (_selected.indexOf(key) > -1) {
                                op.prop("selected", true);
                            }
                        }
                    });
                }
    
                this._createOptions();
                this.observer.observe(element[0], {
                    childList: true,
                    subtree: true,
                });
    
                return this;
            },
            addOption: function (val, title, selected) {
                const element = this.element;
                const option = $("<option>")
                    .attr("value", val)
                    .text(title ? title : val);
    
                element.append(option);
    
                if (selected) {
                    if (element[0].multiple) {
                        // nothing
                    } else {
                        element.find("option").prop("selected", false);
                    }
                    option.prop("selected", true);
                }
    
                // this._createOptions();
    
                return this;
            },
    
            addOptions: function (values) {
                const that = this;
    
                if (!values) {
                    return this;
                }
    
                this.observer.disconnect();
                
                if (Array.isArray(values)) {
                    $.each(values, function () {
                        const o = this;
                        if (Metro.utils.isObject2(o)) {
                            that.addOption(o.val, o.title, o.selected);
                        } else {
                            that.addOption(o);
                        }
                    });
                } else if (Metro.utils.isObject2(values)) {
                    $.each(values, function (key, val) {
                        that.addOption(key, val);
                    });
                }
    
                this._createOptions();
                
                this.observer.observe(element[0], {
                    childList: true,
                    subtree: true,
                });
                
                return this;
            },
    
            removeOption: function (val) {
                const element = this.element;
                const options = element.find("option");
    
                options.each(function () {
                    const $el = $(this);
    
                    if ($el.attr("value") == val) { // == important
                        $el.remove();
                    }
                });
    
                this._createOptions();
    
                return this;
            },
    
            removeOptions: function (values) {
                const element = this.element;
                const options = element.find("option");
    
                if (!values || !Array.isArray(values)) {
                    return this;
                }
    
                options.each(function () {
                    const $el = $(this);
                    const val = $el.attr("value");
    
                    if (values.indexOf(val) > -1) {
                        $el.remove();
                    }
                });
    
                this._createOptions();
    
                return this;
            },
            fetch: async function(source, options){
                const element = this.element;
                const _options = Object.assign({
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                }, options);
                
                const result = await fetch(source, _options);
                
                if (result.ok === false) { return; }
                
                const data = await result.json();
                
                $.each(data, function () {
                    const option = $("<option>").attr("value", this.value).html(this.text);
                    if (this.icon) {
                        option.attr("data-icon", this.icon);
                    }
                    option.appendTo(element);
                });
            },
    
            changeAttribute: function (attributeName) {
                if (attributeName === "disabled") {
                    this.toggleState();
                }
            },
    
            destroy: function () {
                const element = this.element;
                const container = element.closest(".select");
                const drop_container = container.find(".drop-container");
                const input = element.siblings(".select-input");
                const filter_input = drop_container.find("input");
                const list = drop_container.find("ul");
                const clearButton = container.find(".input-clear-button");
    
                container.off(Metro.events.click);
                container.off(Metro.events.click, ".input-clear-button");
                input.off(Metro.events.click);
                filter_input.off(Metro.events.blur);
                filter_input.off(Metro.events.focus);
                list.off(Metro.events.click, "li");
                filter_input.off(Metro.events.keyup);
                drop_container.off(Metro.events.click);
                clearButton.off(Metro.events.click);
    
                drop_container.data("dropdown").destroy();
    
                container.remove();
            },
        });
    
        $(document).on(
            Metro.events.click,
            function () {
                $(".select").removeClass("focused");
            },
            { ns: "blur-select-elements" },
        );
    })(Metro, Dom);
    