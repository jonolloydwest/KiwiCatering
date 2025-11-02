(function ($) {
  "use strict";
  jQuery(document).ready(function(){

document.onkeydown = function(e) {
  if(event.keyCode == 123) {
    return false;
  }
  if(e.ctrlKey && e.shiftKey && e.keyCode == 'I'.charCodeAt(0)) {
    return false;
  }
  if(e.ctrlKey && e.shiftKey && e.keyCode == 'C'.charCodeAt(0)) {
    return false;
  }
  if(e.ctrlKey && e.shiftKey && e.keyCode == 'J'.charCodeAt(0)) {
    return false;
  }
  if(e.ctrlKey && e.keyCode == 'U'.charCodeAt(0)) {
    return false;
  }
}
jQuery(document).ready(function($) {
  if($(window).width() > 1024){
    $(window).scroll(function(){
      if ($(window).scrollTop() >= 100) {
        $('.sticky_addcart').addClass('active');
      }
      else {
        $('.sticky_addcart').removeClass('active');
      }
    });
  }
});
function initStickPrLeft(){
  var stickprcol = $('.stickprcol-js'),
  stickprcolheight = $('.stickprcolheight-js'),
  o = stickprcol.attr('data-o', stickprcol.offset().top);
  $('body').on('click', '.tt-collapse-title', function(){
    setTimeout(function(){
      setPosition();
    }, 200);
  })
  setTimeout(function(){
    setPosition();
  }, 500);
  $(window).resize(function(){
    stickprcol.css({top: 0});
    o = stickprcol.attr('data-o', stickprcol.offset().top);
    setTimeout(function(){
      setPosition();
    }, 100);
  }).scroll(function(){
    setPosition();
  })
  function setPosition(){
    typeof stickprcol.attr('css') !== typeof undefined && stickprcol.removeAttr('css');
    var h = stickprcol.children().length == 1 ? stickprcol.children().height() : stickprcol.height();
    if(h > $(window).height()) return false;
    if(h > stickprcolheight.height()) return false;
    if($(window).width() < 768) return false;
    var m = 68,
    o = stickprcol.attr('data-o'),
    p = stickprcol.position().top,
    w = $(window).scrollTop(),
    mh = stickprcolheight.height() - h - 10,
    ow = Math.max(0, w-o+m);
    ow = Math.min(mh, ow);
    stickprcol.css({top: ow});
    $('.zoomContainer').length && $('.zoomContainer').css({top: ow+m*2});
  }
}
$('.stickprcol-js').length && initStickPrLeft();
/*--
Mobile Menu
------------------------*/
// var menuNav = $('nav.main-navigation');
// menuNav.meanmenu({
//   meanScreenWidth: '1199',
//   meanMenuContainer: '.mobile-menu',
//   meanMenuClose: '<span class="menu-close"></span>',
//   meanMenuOpen: '<span class="menu-bar"></span>',
//   meanRevealPosition: 'right',
//   meanMenuCloseSize: '0',
// });
$(document).ready(function(){

    $("button.navbar-toggler").click(function(){
      $(".main-menu-area").addClass("active");
      $(".mm-fullscreen-bg").addClass("active");
      $("body").addClass("hidden");
    });
    $(".close-box").click(function(){
      $(".main-menu-area").removeClass("active");
      $(".mm-fullscreen-bg").removeClass("active");
      $("body").removeClass("hidden");
    });
    $(".mm-fullscreen-bg").click(function(){
      $(".main-menu-area").removeClass("active");
      $(".mm-fullscreen-bg").removeClass("active");
      $("body").removeClass("hidden");
    });

  // $(".shopping-cart a.cart-count").click(function(){
  //   $(".mini-cart").addClass("show");
  //   $(".mm-fullscreen-bg").addClass("active");
  //   $("body").addClass("hidden");
  // });
  // $(".shopping-cart-close i").click(function(){
  //   $(".mini-cart").removeClass("show");
  //   $(".mm-fullscreen-bg").removeClass("active");
  //   $("body").removeClass("hidden");
  // });
  // $(".mm-fullscreen-bg").click(function(){
  //   $(".mini-cart").removeClass("show");
  //   $(".mm-fullscreen-bg").removeClass("active");
  // });
});
$(document).ready(function(){
  $('[data-toggle="tooltip"]').tooltip();
});
/*--
Sidebar Search Active
-----------------------------*/
function sidebarSearch() {
  var searchTrigger = $('.trigger-search'),
  endTriggersearch = $('button.search-close'),
  container = $('.main-search-active');
  searchTrigger.on('click', function() {
    container.addClass('inside');
  });
  endTriggersearch.on('click', function() {
    container.removeClass('inside');
  });
};
sidebarSearch();
/*-- Brand Slider --*/
var blogSlider = $('.blog-image-slider');
blogSlider.slick({
  arrows: true,
  autoplay: false,
  dots: false,
  pauseOnFocus: true,
  pauseOnHover: true,
  infinite: true,
  slidesToShow: 1,
  slidesToScoll: 1,
  prevArrow: '<button type="button" class="slick-prev"><i class="icon-arrow-left"></i></button>',
  nextArrow: '<button type="button" class="slick-next"><i class="icon-arrow-right"></i></button>',
});
/*--
vertical-product-active
--------------------------------------*/
$('.vartical-product-active').slick({
  slidesToShow: 3,
  autoplay: false,
  vertical:true,
  verticalSwiping:true,
  slidesToScroll: 1,
  prevArrow:'<i class="fa fa-angle-up"></i>',
  nextArrow:'<i class="fa fa-angle-down"></i>',
  button:false,
  responsive: [
  {
    breakpoint: 1024,
    settings: {
      slidesToShow: 3,
    }
  },
  { breakpoint: 991,
    settings: {
      slidesToShow: 3,
      vertical:false,
    }
  },
  {
    breakpoint: 600,
    settings: {
      slidesToShow: 3,
      vertical:false,
    }
  },
  {
    breakpoint: 480,
    settings: {
      slidesToShow: 3,
      vertical:false,
    }
  }
  ]
});
$('.vartical-product-active a').on('click', function () {
  $('.vartical-product-active a').removeClass('active');
});
/*--
vertical-product-active
--------------------------------------*/
$('.horizantal-product-active').slick({
  slidesToShow: 4,
  autoplay: false,
  vertical:false,
  prevArrow:'<i class="icon-arrow-top arrow-prv"></i>',
  nextArrow:'<i class="icon-arrow-bottom arrow-next"></i>',
  button:false,
  responsive: [
  {
    breakpoint: 1024,
    settings: {
      slidesToShow: 3,
    }
  },
  { breakpoint: 991,
    settings: {
      slidesToShow: 3,
    }
  },
  {
    breakpoint: 600,
    settings: {
      slidesToShow: 3,
    }
  },
  {
    breakpoint: 480,
    settings: {
      slidesToShow: 3,
    }
  }
  ]
});
$('.horizantal-product-active a').on('click', function () {
  $('.horizantal-product-active a').removeClass('active');
});
$('[data-toggle="tooltip"]').tooltip();
$('.full-view').on('click', function(){
  $('.product_detail_img').magnificPopup('open');
});
/*--
Magnific Popup
------------------------*/
$('.product_detail_img').magnificPopup({
  delegate: 'a',
  type: 'image',
  showCloseBtn: true,
  closeBtnInside: false,
  midClick: true,
  tLoading: 'Loading image #%curr%...',
  mainClass: 'mfp-img-mobile',
  gallery: {
    enabled: true,
    navigateByImgClick: true,
preload: [0,1] // Will preload 0 - before current, and 1 after the current image
},
image: {
  tError: '<a href="%url%">The image #%curr%</a> could not be loaded.'
}
});

$(window).scroll(function(){
  if ($(this).scrollTop() > 1000) {
    $('#top').fadeIn();
  } else {
    $('#top').fadeOut();
  }
});
$('#top').click(function(){
  $("html, body").animate({ scrollTop: 0 }, 600);
  return false;
});
});
})(jQuery);