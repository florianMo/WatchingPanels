//Copyright (C) 2013  Florian Motteau
//
//This program is free software: you can redistribute it and/or modify
//it under the terms of the GNU General Public License as published by
//the Free Software Foundation, either version 3 of the License, or
//(at your option) any later version.
//
//This program is distributed in the hope that it will be useful,
//but WITHOUT ANY WARRANTY; without even the implied warranty of
//MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//GNU General Public License for more details.
$(document).ready(function() {
    // create first panel set
    var _onePanel = $("<div></div>", {"class" : "inner-panel"})
        .wrap($("<div></div>", {"class" : "panel"}))
        .parent();
    _pageWrapper = $("#page-wrapper");
    for(i=0; i<45; i++) { _onePanel.clone().appendTo(_pageWrapper); }
    // init values
    var _perspective = 800,
    _panels = $(".panel"),
    _innerPanels = $(".inner-panel"),
    _flashlight = true,
    _flashlightSize = 10,
    _pageWrapperWidth = parseInt($("#page-wrapper").css("width"),10),
    _panelHeight = 100,
    _panelWidth = 100,
    _repulseStrength = 100,
    _repulse = true,
    _keepPanelOrientation = false;
    // create sliders
    $("#slider-colonnes").slider({
        animate: true,
        range: "min",
        value: 9,
        min: 1,
        max: 26,
        step: 1
    });
    $("#slider-lignes").slider({
        animate: true,
        range: "min",
        value: 5,
        min: 1,
        max: 13,
        step: 1
    });
    $("#slider-perspective").slider({
        animate: true,
        range: "min",
        value: 800,
        min: 25,
        max: 2000,
        step: 25,
        change: function(event, ui) { _perspective = ui.value; }
    });
    $("#slider-flashlight").slider({
        animate: true,
        range: "min",
        value: 10,
        min: 1,
        max: 20,
        change: function(event, ui) { _flashlightSize = ui.value; }
    });
    $("#slider-corner").slider({
        animate: true,
        range: "min",
        value: 10,
        min: 0,
        max: 50,
        step: 1,
        change: function(event, ui) { _innerPanels.css({ "border-radius" : ui.value+"px" }); }
    });
    $("#slider-size").slider({
        animate: true,
        range: "min",
        value: 100,
        min: 0,
        max: 100,
        step: 1,
        change: function(event, ui) {
            _innerPanels.css({
                "height" : ((ui.value*_panelHeight)/100)+"px",
                "width"  : ((ui.value*_panelWidth)/100)+"px"
            });
        }
    });
    $("#slider-repulse").slider({
        animate: true,
        range: "min",
        value: 100,
        min: 10,
        max: 1000,
        step: 10,
        change: function(event, ui) { _repulseStrength = ui.value; }
    });
    // update globals for switches
    $("#switch-flashlight input").change(function() {_flashlight = ($(this).parent().attr("class") === "switch-on") ? false : true; });
    $("#switch-repulse input").change(function() { _repulse = ($(this).parent().attr("class") === "switch-on") ? false : true; });
    $("#switch-orientation input").change(function() { _keepPanelOrientation = ($(this).parent().attr("class") === "switch-on") ? false : true; });
    // store each panel position in jquery's data
    // 2 sets : one for orientation, one for opacity calculation
    initPanelData();
    // create draggable panels, with position update on stop event if user checked
    initDraggablePanels();
    // update rotation/opacity of each panels on mouse move event
    $(document).on("mousemove",function(event) {
        // called for each panel on each mousemove --> critical, avoid $(...)
        _innerPanels.each(function() {
            var currentPanel = $(this),
                eventX = event.pageX,
                eventY = event.pageY,
                xTrig = currentPanel.data("centerX") - eventX,
                yTrig = currentPanel.data("centerY") - eventY,
                xOpacity,
                yOpacity,
                distance,
                yAngle = Math.atan(xTrig/_perspective),
                xAngle = -Math.atan(yTrig/_perspective);  
            // if flashlight or repulse on, do the maths
            if(_flashlight || _repulse) {
                xOpacity = currentPanel.data("opacityX") - eventX;
                yOpacity = currentPanel.data("opacityY") - eventY;
                distance = Math.sqrt((xOpacity * xOpacity) + (yOpacity * yOpacity));
            }
            // rotation matrices
            var m_rotationX = $M([
                [1,0,0,0],
                [0,Math.cos(xAngle), Math.sin(-xAngle), 0],
                [0,Math.sin(xAngle), Math.cos(xAngle), 0],
                [0,0,0,1]
            ]);
            var m_rotationY = $M([
                [Math.cos(yAngle),0,Math.sin(yAngle),0],
                [0,1,0,0],
                [Math.sin(-yAngle),0,Math.cos(yAngle),0],
                [0,0,0,1]
            ]);
            var tM = m_rotationX.x(m_rotationY);
            // add translation if set
            if(_repulse) {
                var zOffset = _repulseStrength*Math.exp(-0.00001*(distance*distance));
                var m_translationZ = $M([
                    [1,0,0,0],
                    [0,1,0,0],
                    [0,0,1,0],
                    [zOffset,zOffset,zOffset,1]
                ]);
                tM = tM.x(m_translationZ);
            }
            // construct final css string
            var s = "matrix3d(";
            s += tM.e(1,1).toFixed(10) + "," + tM.e(1,2).toFixed(10) + "," + tM.e(1,3).toFixed(10) + "," + tM.e(1,4).toFixed(10) + ","
            s += tM.e(2,1).toFixed(10) + "," + tM.e(2,2).toFixed(10) + "," + tM.e(2,3).toFixed(10) + "," + tM.e(2,4).toFixed(10) + ","
            s += tM.e(3,1).toFixed(10) + "," + tM.e(3,2).toFixed(10) + "," + tM.e(3,3).toFixed(10) + "," + tM.e(3,4).toFixed(10) + ","
            s += tM.e(4,1).toFixed(10) + "," + tM.e(4,2).toFixed(10) + "," + tM.e(4,3).toFixed(10) + "," + tM.e(4,4).toFixed(10)
            s += ")";
            // if selected, opacity is reduced when cursor is far
            if(_flashlight) {
                var dimOpacity = ((distance * 0.99) / _pageWrapperWidth) * (10 / _flashlightSize);
                currentPanel.css({
                    "-webkit-transform" : s,
                    "-moz-transform" : s,
                    "-o-transform" : s,
                    "-ms-transform" : s,
                    "transform" : s,
                    "opacity" : (1-dimOpacity)
                });
            } else {
                currentPanel.css({
                    "-webkit-transform" : s,
                    "-moz-transform" : s,
                    "-o-transform" : s,
                    "-ms-transform" : s,
                    "transform" : s,
                    "opacity" : 0.6
                });
            }
        })
    })
    // update parameters from user input
    $("#apply-button").on("click",function() {
        var col = $("#slider-colonnes").slider("option", "value"),
            lig = $("#slider-lignes").slider("option", "value"),
            per = $("#slider-perspective").slider("option", "value");
        _panelHeight = parseInt(_pageWrapper.css("height"),10) / lig;
        _panelWidth = _pageWrapperWidth / col;
        // destroy old matrix
        _pageWrapper.html("");
        // create new matrix
        for(i=0; i<col*lig; i++) { _onePanel.clone().appendTo(_pageWrapper); }
        // update global variable for panels
        _panels = $(".panel");
        _innerPanels = $(".inner-panel");
        // update panels size
        _panels.css({
            "width" : _panelWidth+"px",
            "height" : _panelHeight+"px"
        });
        // store panels dimensions in jquery's data
        _innerPanels.each(function() {
            var currentPanel = $(this);
            currentPanel.data("centerX",this.offsetLeft+(this.offsetWidth / 2));
            currentPanel.data("centerY",this.offsetTop+(this.offsetHeight / 2));
        })
        // update sliders values
        $("#slider-corner").slider("option","max",((_panelWidth < _panelHeight) ? _panelWidth : _panelHeight));
        $("#slider-corner").slider("option","value",10);
        $("#slider-repulse").slider("option","value",100);
        $("#slider-size").slider("option","value",100);
        _innerPanels.css({"border-radius" : "10px"});
        // update perspective
        _perspective = per;
        // init panels position data
        initPanelData();
        // reload click behaviors
        initDraggablePanels();
        initClickablePanels();
    });
    // FUNCTIONS
    // ---------
    // launch draggable panels
    function initDraggablePanels() {
        _innerPanels.draggable({
            stop : function(event,ui) {
                var currentPanel = $(this);
                // if keep orientation set to on, update panel center position
                if(!_keepPanelOrientation) {
                    ui.helper.data("centerX",currentPanel.data("centerX") + ui.position["left"]);
                    ui.helper.data("centerY",currentPanel.data("centerY") + ui.position["top"]);
                }
                // always update panel position for opacity calculation
                ui.helper.data("opacityX",currentPanel.data("opacityX") + ui.position["left"]);
                ui.helper.data("opacityY",currentPanel.data("opacityY") + ui.position["top"]);
            }     
        });
    }
    // init panels position data
    function initPanelData() {
        _innerPanels.each(function() {
            var currentPanel = $(this);
            var rawCurrentPanel = this;
            currentPanel.data("centerX",rawCurrentPanel.offsetLeft+(rawCurrentPanel.offsetWidth / 2));
            currentPanel.data("centerY",rawCurrentPanel.offsetTop+(rawCurrentPanel.offsetHeight / 2));
            currentPanel.data("opacityX",rawCurrentPanel.offsetLeft+(rawCurrentPanel.offsetWidth / 2));
            currentPanel.data("opacityY",rawCurrentPanel.offsetTop+(rawCurrentPanel.offsetHeight / 2));
        });
    }
})