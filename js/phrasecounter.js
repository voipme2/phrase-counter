/**
 * phrasecounter.js
 *
 * Contains the Javascript for the application.  Might eventually split this into different files.
 *
 * TODO:
 *  - dynamically adding items to the chart
 */
 
 $(function() {
    
    var timer = null;
    var startTime = null;
    var endTime = null;
    var plot, historyPlot;
    
    // Models
    var Phrase = Backbone.Model.extend({
        defaults: function() {
            return {
                phrase: "empty phrase",
                count: 0,
                hotkey: ""
            };
        },
        
        initialize: function() {
            if (!this.get("phrase")) {
                this.set({"phrase": this.defaults.phrase });
            }
            
            if (!this.get("hotkey")) {
                this.set({ "hotkey": this.get("phrase")[0].toLowerCase() });
            }
            
            if (!this.get("color")) {
                this.set({ "color": this.getColor() });
            }
            
            this.emptyData();
       
        },
        
        // temporary
        getColor: function() {
            var hexStr = Math.round(Math.random() * 16777215).toString(16);
            return "#" + Array(7 - hexStr.length).join("0") + hexStr;
        },
       
        setHotkey: function(c) {
            this.save({ hotkey: c.toLowerCase() });
        },
        
        inc: function() {
            this.save({ count: this.get("count") + 1 });
        },
        
        dec: function() {
           this.save({ count: this.get("count") - 1 });
        },

        reset: function() {
            this.emptyData();
            this.save({ count: 0 });
        },
        
        pushData: function() {
            var cData = this.get("chartData");
            cData.shift();
            cData.push(this.get("count"));
            this.set({"chartData": cData});
        },
        
        emptyData: function() {
            var arr = new Array(180),
                i = 180;
            while (i--) {
                arr[i] = 0;
            }
            
            this.set({ "chartData": arr });
        },
        
        clear: function() {
            this.destroy();
        }
    });
    
    var PhraseHistory = Phrase.extend({
        initialize: function() {
            if (!this.get("date")) {
                this.set({ date: new Date() });
            }
        }
    });

    // Collections
    var PhraseList = Backbone.Collection.extend({
        model: Phrase,
        localStorage: new Store("pc-phrase"),
        
        hasHotkey: function(hotkey) {
            return this.filter(function(phrase){ 
                return phrase.get('hotkey') == hotkey.toLowerCase(); 
            });
        }
    });
    
    var PhraseHistoryList = Backbone.Collection.extend({
        model: PhraseHistory,
        localStorage: new Store("pc-history"),
        
        chartData: function() {
        // TODO
            var obj = this.groupBy(function(p) {
                var d = p.get('date');
                return (d.getMonth() + 1) + "/" + d.getDate();
            });
        }
    });

    var Phrases = new PhraseList;
    var PHistory = new PhraseHistoryList;
    
    var PhraseView = Backbone.View.extend({
        tagName: "div",
        template: _.template($("#phrase-template").html()),
        events: {
            "click .delete"  : "clear",
            "click .hotkey"  : "changeHotkey",
            "click .plus"    : "incrementCount",
            "click .minus"   : "decrementCount"
        },
        
        initialize: function() {
            this.model.bind("change", this.render, this);
            this.model.bind("destroy", this.remove, this);
        },
        
        render: function() {
            this.$el.html(this.template(this.model.toJSON()));
            return this;
        },
        
        changeHotkey: function() {
            var c = prompt("Enter a hotkey:");
            if (c) {
                this.model.setHotkey(c);
            }
        },
        
        incrementCount: function() {
            this.model.inc();
        },
        
        decrementCount: function() {
            this.model.dec();
        },
        
        clear: function() {
            this.model.clear();
        }
    });
    
    var AppView = Backbone.View.extend({
        el: $("#phrase-app"),
        events: {
            "keypress #new-phrase"  : "createOnEnter",
            "click #start"          : "startTiming",
            "click #stop"           : "stopTiming",
            "click #reset"          : "resetPage",
            "click #save"           : "saveHistory"
        },
        
        initialize: function() {
            
            $(document).bind('keydown', this.checkHotkey);
        
            this.newPhrase = $("#new-phrase");
        
            Phrases.bind("add", this.addPhrase, this);
            Phrases.bind("reset", this.addAllPhrases, this);
            Phrases.bind("all", this.render, this);
            
            Phrases.fetch();
            PHistory.fetch();
            
            // we'll also render the graph, now that we have the history
            plot = $.jqplot('graph', Phrases.pluck("chartData"), {
                axes: {
                  yaxis: { min: 0 },
                  xaxis: { min: 0 }
                },
                series: Phrases.map(function(p) { 
                    return {
                        color: p.get("color"),                    
                        markerOptions: { show: false } 
                    }; 
                })
            });
            
            //historyPlot = $.jqplot('history', PHistory.chartData());
        },
        
        render: function() {
            
        },
        
        addPhrase: function(phrase) {
            var view = new PhraseView({ model: phrase })
            this.$("#active-phrases").append(view.render().el);
        },
        
        addAllPhrases: function() {
            Phrases.each(this.addPhrase);
        },
        
        createOnEnter: function(e) {
            if (e.keyCode != 13) return;
            if (!this.newPhrase.val()) return;
            
            Phrases.create({ phrase: this.newPhrase.val() });
            this.newPhrase.val('');
        },
        
        checkHotkey: function(e) {
            if (!e.ctrlKey) {
                var c = String.fromCharCode(e.keyCode);
                _.each(Phrases.hasHotkey(c), function(phrase){ phrase.inc(); });
            }
        },
        
        saveHistory: function() {
            this.stopTiming();
            var msg = "Totals:\n";
            var mElapsed = this.getMinutesElapsed();
            Phrases.each(function(p) {
                msg += "\t" + p.get("phrase") + ": " 
                    + p.get("count") + " (" + (parseInt(p.get("count")) / mElapsed).toPrecision(3) + ")\n";
                PHistory.create({ phrase: p, date: new Date() });
            });
            this.resetPage();
            alert(msg);
            
        },

        startTiming: function() {
            if (timer == null) {
                startTime = new Date();
                timer = setInterval(this.updateTime, 1000);
            }
        },
        
        stopTiming: function() {
            clearInterval(timer);
            this.timer = null;
            endTime = new Date();
        },
        
        updateTime: function() {
            var now = new Date();
            var elapsed = Math.round((now - startTime) / 1000);
            var m = Math.floor(elapsed / 60);
            var s = elapsed - (m * 60);
            
            this.$("#elapsed").text(m + "m " + s + "s");
            
            Phrases.each(function(phrase) {
                phrase.pushData();
            });
            
            var newData = Phrases.pluck("chartData");
            _.each(newData, function(el, ind) {
                var nd = _.map(el, function(num, i) {
                        return [i, num];
                    });
                plot.series[ind].data = nd;
            });
            
            plot.replot({ clear: true, resetAxes: true });
            
        },
        
        getMinutesElapsed: function() {
            return (Math.round((endTime - startTime) / 1000) / 60);
        },
        
        resetPage: function() {
            Phrases.each(function(phrase) { phrase.reset(); });
            this.stopTiming();
            this.$("#elapsed").text("");
        }
    });
    
    var App = new AppView;
 });