/**
 * phrasecounter.js
 *
 * Contains the Javascript for the application.  Might eventually split this into different files.
 */
 
 $(function() {
    
    // Models
    var Phrase = Backbone.Model.extend({
        defaults: function() {
            return {
                phrase: "empty phrase",
                count: 0,
                color: "#000",
                hotkey: "",
                date: new Date()
            };
        },
        
        initialize: function() {
            if (!this.get("phrase")) {
                this.set({"phrase": this.defaults.phrase });
            }
            this.set({ "color": this.getColor() });
        },
        
        // temporary
        getColor: function() {
            var colors = [ "red", "orange", "blue", "green" ]
            var ind = Math.floor(Math.random() * colors.length);
            return colors[ind];
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
        
        clear: function() {
            this.destroy();
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
        },

        comparator: function(phrase) {
            return phrase.get("date");
        }
    });
    
    var Phrases = new PhraseList;
    
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
            "click #reset"          : "resetPage"
        },
        
        initialize: function() {
            
            $(document).bind('keydown', this.checkHotkey);
        
            this.newPhrase = $("#new-phrase");
        
            Phrases.bind("add", this.addPhrase, this);
            Phrases.bind("reset", this.addAllPhrases, this);
            Phrases.bind("all", this.render, this);
            
            Phrases.fetch();
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
            var c = String.fromCharCode(e.keyCode);
            _.each(Phrases.hasHotkey(c), function(phrase){ phrase.inc(); });                     
        },
        
        startTiming: function() {
            alert("todo");
        },
        
        stopTiming: function() {
            alert("todo");
        },
        
        resetPage: function() {
            alert("todo");
        }
    });
    
    var App = new AppView;
 });