﻿
define([
    "dojo",
    "dojo/_base/declare",
    "epi/_Module",
    "dojo/topic",
    "dojo/request"
], function (
    dojo,
    declare,
    _Module,
    topic,
    request
) {
    return declare([_Module], {

        isPublishing: false,
        isInitialized: false,

        initialize: function () {
            this.inherited(arguments);

            topic.subscribe('/epi/shell/context/current', this.contextCurrent.bind(this));
            topic.subscribe('/epi/shell/context/changed', this.contextChange.bind(this));
            topic.subscribe('/epi/cms/content/statuschange/', this.statusChange.bind(this));
        },

        /**
         * Event for shell updates. Gets current context. Should only be called one to initialize the _si plugin.
         */
        contextCurrent: function (content) {
            if (!request || this.isInitialized)
                return;

            if (!content.capabilities || !content.capabilities.isPage)
                return;

            this.isInitialized = true;
            var that = this;

            this.getPageUrl(content.id, content.language)
                .then(function (response) {
                    that.pushSi(response.isDomain ? "domain" : "input", response.url);
                },
                    function (error) {
                        that.pushSi('input', '');

                    });
        },

        /**
         * When content changes status, to publish for example. NOTE! No longe in use. Publish events are triggered in backend.
         */
        statusChange: function (status, page) {
            if (status === 'Publish' || status === 3) {
                this.isPublishing = true;
            }
        },

        /**
         * Similar to contextCurrent. Used for pushing the input event.
         */
        contextChange: function (content, ctx) {
            if (!this.isPublishOrViewContext(content, ctx)) {
                return;
            }
            //if(ctx.sender.isSaving) return; //We are in middle of an edit

            var that = this;

            this.getPageUrl(content.id, content.language)
                .then(function (response) {
                    if (that.isPublishing) {
                        that.pushSi("recheck", response.url);
                        that.isPublishing = false;

                        //setTimeout(function () {
                        //    that.pushSi("input", response.url);
                        //}, 1 * 1000);
                    }
                    else {
                        that.pushSi(response.isDomain ? "domain" : "input", response.url);
                    }
                }, function (error) {
                    that.pushSi('input', '');
                });
        },

        /**
         * Will get the page url from backend
         * Returns Promise.
         */
        getPageUrl: function (contentId, locale) {
            return request.get('/siteimprove/pageUrl',
                {
                    query: {
                        contentId: contentId,
                        locale: locale
                    },
                    handleAs: 'json'
                });
        },

        /**
         * Request token from backoffice and sends request to Siteimprove
         */
        pushSi: function (method, url) {
            var si = window._si || [];

            request.get('/siteimprove/token', { handleAs: 'json' })
                .then(function (response) {

                    // Send of to siteimprove
                    si.push([method, url, response, function () {
                        console.log('SiteImprove pass: ' + method + ' - ' + url);
                    }]);
                }.bind(this));
        },

        /**
         * Helper method for event: /epi/shell/context/changed'
         */
        isPublishOrViewContext: function (content, ctx) {
            // Not intereseted if there is no
            if (!content || !content.publicUrl) {
                return false;
            }

            // If it's not a page ignore it
            if (content.capabilities && !content.capabilities.isPage) {
                return false;
            }

            if (ctx.trigger && !this.isPublishing) {
                return false;
            }

            return true;
        }
    });
});