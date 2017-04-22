(function($) {
    $(function() {
        var terminal = $('.terminal'),
        input = $('#input'),
        colours = $('[name="colours"]'),
        light = $('[name="light"]'),

        _shareLink = function() {
            var url = window.location.href.replace(/#.+/, '');

            if (input.val()) {
                url += '#!input=' + btoa(input.val()) + '&' + $('.global-options :checked').serialize();
            }

            if (window.location.href != url) {
                history.pushState(history.state, url, url);
            }

            return url;
        },

        _loadFromHash = function() {
            if (window.location.hash) {
                var data = window.location.hash.replace(/^#!/, ''),
                elements = {
                    input: input,
                    colours: colours,
                    light: light
                };

                $('.global-options [type="checkbox"]').prop('checked', false).trigger('change');

                data.split(/&/).forEach(function(item) {
                    var data = item.split(/=/),
                    element = elements[data[0]],
                    value;

                    if (element === input) {
                        value = atob(data[1]);
                        element.val(value).trigger('change');
                    }
                    else {
                        value = data[1];

                        if (element) {
                            if (element.is('[type="radio"], [type="checkbox"]')) {
                                element.filter('[value="' + value + '"]').prop('checked', true).trigger('change');
                            }
                            else {
                                element.val(value).trigger('change');
                            }
                        }
                    }
                });
            }
        };

        new Clipboard('.share', {
            text: _shareLink
        });

        $('.share').on('click', function(event) {
            event.preventDefault();

            $('.url-copied').removeClass('hidden').show();

            window.setTimeout(function() {
                $('.url-copied').fadeOut('slow');
            }, 5000);
        });

        input.on('change keyup paste', function() {
            input.val().split(/:/).forEach(function(block) {
                // var [selector, styles] = block.split(/=/);
                // styles = parse.parseStyles(styles);
                var data = block.split(/=/, 2),
                selector = data[0],
                styles = parse.parseStyles(data[1]);

                $('.' + selector).removeAttr('style').each(function() {
                    var classes = selector,
                    el = $(this);

                    $.each(styles, function(style) {
                        if (style.match(/bg|fg/)) {
                            classes += ' ' + style + '-' + styles[style];

                            if (styles[style].match(/^true-/)) {
                                if (style.match(/bg/)) {
                                    el.css('background-color', parse.rgbToHex(styles[style].replace(/^true-/).split(/-/)));
                                }
                                else if (style.match(/fg/)) {
                                    el.css('color', parse.rgbToHex(styles[style].replace(/^true-/).split(/-/)));
                                }
                            }
                        }
                        else if (styles[style]) {
                            classes += ' ' + style;
                        }
                    });

                    this.className = classes;
                });

                $('[data-fragment="' + selector + '"] [name="bg-default"]').prop('checked', false);
                $('[data-fragment="' + selector + '"] [name="bg"]').show();
                $('[data-fragment="' + selector + '"] [name="fg-default"]').prop('checked', false);
                $('[data-fragment="' + selector + '"] [name="fg"]').show();

                $.each(styles, function(style) {
                    if (style == 'bg' || style == 'fg') {
                        var colour = styles[style];

                        if (colour.match(/true-/)) {
                            colour = parse.rgbToHex(colour.replace(/true-/, '').split(/-/));
                        }
                        else if (colour.match(/256-/)) {
                            colour = parse.rgbToHex(parse.term256ToRgb(colour.replace(/256-/, '')));
                        }
                        else if ((colour == 49 || !colour) && style == 'bg') {
                            colour = '';
                            $('[data-fragment="' + selector + '"] [name="bg-default"]').prop('checked', true);
                            $('[data-fragment="' + selector + '"] [name="bg"]').hide();
                        }
                        else if ((colour == 39 || !colour) && style == 'fg') {
                            colour = '';
                            $('[data-fragment="' + selector + '"] [name="fg-default"]').prop('checked', true);
                            $('[data-fragment="' + selector + '"] [name="fg"]').hide();
                        }
                        else {
                            colour = parse.rgbToHex(parse.term16ToRgb(colour));
                        }

                        $('[data-fragment="' + selector + '"] [name="' + style + '"]').val(colour);
                    }
                    else {
                        $('[data-fragment="' + selector + '"] [name="' + style + '"]').prop('checked', styles[style]);
                    }
                });
            });

            $('.copy-paste .contents').html(this.value);
        });

        $('.builder .block').on('change', 'input', function() {
            _updateInput();
        });

        var _updateInput = function() {
            var value = '';

            $('.builder .block').each(function() {
                value += $(this).attr('data-fragment') + '=' + _getStyle($(this)) + ':';
            });

            value = value.replace(/:$/, '');

            return input.val(value).trigger('change');
        },
        _getStyle = function(block) {
            var inputs = block.find(':input'),
            style = $.extend({}, parse.defaultStyle);

            inputs.filter(':not([name="bg-default"], [name="fg-default"])').each(function() {
                var value;

                if ($(this).is('select')) {
                    value = $(this).val();
                }
                else if ($(this).is('[type="checkbox"]')) {
                    value = this.checked;
                }
                else if ($(this).is('[type="radio"]')) {
                    if (this.checked) {
                        value = this.value;
                    }
                }
                else {
                    value = this.value;
                }

                if (this.name === 'bg' || this.name === 'fg') {
                    if ($('[name="colours"]:checked').val() === '16') {
                        style[this.name] = parse.rgbToTerm16(parse.hexToRgb(value), this.name == 'bg');
                    }
                    else if ($('[name="colours"]:checked').val() === '256') {
                        style[this.name] = parse.simplifyColour('256-' + parse.rgbToTerm256(parse.hexToRgb(value)), this.name == 'bg');
                    }
                    else {
                        style[this.name] = parse.simplifyColour('true-' + parse.hexToRgb(value).join('-'), this.name == 'bg');
                    }
                }
                else if (['bold', 'dim', 'italic', 'underline', 'blink', 'overline', 'invert', 'hidden', 'strikethrough'].includes(this.name)) {
                    style[this.name] = value;
                }
            });

            inputs.filter('[name="bg-default"], [name="fg-default"]').each(function() {
                if (this.checked) {
                    if (this.name === 'fg-default') {
                        style.fg = '39';
                    }
                    else if (this.name === 'bg-default') {
                        style.bg = '49';
                    }
                }
            });

            return parse.buildStyles(style).substr(3).replace(/m$/, '');
        };

        $('.global-options input[type="checkbox"]').on('change', function() {
            if (this.checked) {
                terminal.addClass(this.name);
            }
            else {
                terminal.removeClass(this.name);
            }
        });

        $('.global-options input[type="radio"]').on('change', function() {
            terminal.removeClass(function() {
                return Array.from(this.classList).filter(function(className) {
                    return className.match(/cursor/);
                }).join(' ');
            });

            if (this.checked) {
                terminal.addClass(this.name + '-' + this.value);
            }
        });


        $('.load-example').on('click', function(event) {
            event.preventDefault();

            $('#input').val($(this).attr('data-content')).change();
            _shareLink();
        });

        $('.builder .blocks').on('change', '[name="fg-default"], [name="bg-default"]', function() {
            var container = $(this).parents('.checkbox');

            if (this.checked) {
                container.next().hide().attr('disabled');
            }
            else {
                container.next().show().removeAttr('disabled');
            }
        });

        new Clipboard('a.copy');

        $('a.copy').on('click', function(event) {
            event.preventDefault();
        });

        $(window).on("popstate", function(e) {
            _loadFromHash();
        });

        _loadFromHash();
    });
})(jQuery);
