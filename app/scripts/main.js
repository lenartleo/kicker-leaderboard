$('.ui.dropdown')
    .dropdown();
$('.activating.element')
    .popup();
$('.browse.categories')
    .popup({
        popup: '.popup.categories',
        on: 'click',
        inline: true,
        hoverable: false,
        position: 'bottom left',
        delay: {
            show: 200,
            hide: 400
        }
    });
$('.ui.modal').modal({
    inverted: true,
    // blurring: true
});
$('#addPLayerModal').modal('attach events', '.add.player.action', 'show');
$('.ui.modal').modal('attach events', '.close.button', 'hide');
$('.ui.modal').modal('setting', 'transition', 'fade up');

$('.ui.checkbox')
    .checkbox();

$(document).ready(function() {
    $('.right.menu.open').on('click', function(e) {
        e.preventDefault();
        $('.ui.vertical.menu').toggle();
    });

    $('.ui.dropdown').dropdown();

});

$('.special.cards .image').dimmer({
    on: 'hover'
});

$('.toggle.follow')
    .state({
        text: {
            inactive: 'Follow',
            active: '<i class="check icon"></i> Following'
        }
    });

$('.toggle.like')
    .state({
        text: {
            inactive: '<i class="heart empty icon"></i> Like',
            active: '<i class="heart icon"></i> Liked'
        }
    });
$('.menu .item')
    .tab();

$(function() {

    var $allVideos = $('iframe[src^=\'//player.vimeo.com\'], iframe[src^=\'//www.youtube.com\'], object, embed'),
        $fluidEl = $('figure');

    $allVideos.each(function() {

        $(this)
            // jQuery .data does not work on object/embed elements
            .attr('data-aspectRatio', this.height / this.width)
            .removeAttr('height')
            .removeAttr('width');

    });

    $(window).resize(function() {

        var newWidth = $fluidEl.width();
        $allVideos.each(function() {

            var $el = $(this);
            $el
                .width(newWidth)
                .height(newWidth * $el.attr('data-aspectRatio'));

        });

    }).resize();

});
$('.ui.rating')
    .rating('setting', 'clearable', true);
$('.openfullscreen').on('click', function() {
    $('.gallery').addClass('fullscreen');
    $(window).resize();
});
$('.closefullscreen').on('click', function() {
    $('.gallery').removeClass('fullscreen');
    $(window).resize();
});
$('.ui.accordion')
    .accordion();
