# PAGER_WEB_MEMORY
web version of pager - type memory  
contributor : HERO-KUN   
## Intro
Pager is the view which handles paging layouts.   
Inspired by android.support.v4.view.ViewPager, but it is more simillar with Google Play Store mobile application's pager.   
You can add or remove pages dynamically but we recommand to use static layouts to paging.   
You can simply swipe on mobile devices or create tab on desktop platform to change current pages.   

## Changelog
- 2020.04.25 - PM
  - new feature : PageTransitionMethod! you can now customize page transition animation as you want!
- 2020.04.25 - AM
  - you can now use multiple listener on one pager
  - pageListener behaviour changed, now triggers only when page index changed
- 2020.04.24
  - added lockPager property and scrollListener
- 2020.04.23
  - added runtime page add/remove code
- 2020.04.22
  - first version

## Usage
### html
create pager object and its childs(pages) something like this.

```html
<div id="main_pager" style="width: 100%; height: 50%;">   
  <div>Page0 - Some Content here</div>   
  <div>Page1 - Some Content here</div>   
  <div>Page2 - Some Content here</div>   
  <div>Page3 - Some Content here</div>   
</div>   
```

notice that pager object must have its own width and height like % or px etc.   
pager items(pages) can have its child elements like div, span, etc. so fill the child div of pager as you want.   
### javascript
#### Register Pager
register pager and store returned object to control pager like below.   
```javascript
var options = {useOverscroll: true, usePointerEvent: true};   
var pager = pagermemory_registerPager('main', document.getElementById('main_pager'), options);
```

pagermemory_registerPager have 3 parameters :
- __identifier__ is the identifier which must be unique between all pagers in html.
- __pagerElement__ is the div element of pager
- __options__ is the option object of pager. currently, 2 options are available for pager-memory : useOverscroll, usePointerEvent
  - __useOverscroll__ is the flag which enables overscroll fling effect
  - __usePointerEvent__ is the flag which enables pointer(mouse, touch) event. if you want to control pager with only script, disable this option.

#### Functions
you can call these functions on returned pager object :   
- __pager.selectPage(target, animate)__ : select given page
  - target - number : target page index. starts at 0.
  - animate - boolean : enables page transition animation when true. false otherwise.
- __pager.selectNext(animate)__ : select next page
  - animate - boolean : enables page transition animation when true. false otherwise.
- __pager.selectPrev(animate)__ : select previous page
  - animate - boolean : enables page transition animation when true. false otherwise.
- __pager.getSelectedPageIndex()__ : get current selected page index. DO NOT use pager.selected because it contains overscroll dummy container as 1 page.
- __pager.addPage(position, element)__ : inserts a page before given position
  - position - number : position where insert to
  - element - element : page element. this must be div element.
- __pager.removePage(position)__ : removes a given position's page
  - position - number : position where remove to
  - NOTE : pager must have at least 1 page. if you try to remove last one page, error will occur.
- __pager.addPageListener(listener)__ : adds a page change listener to pager.
  - listener - function : function to execute when page changed.
- __pager.removePageListener(listener)__ : removes a page change listener from pager.
  - listener - function : function to remove from pager.
- __pager.removeAllPageListener()__ : removes all page listeners from pager.
- __pager.addScrollListener(listener)__ : adds a scroll change listener to pager.
  - listener - function : function to execute when pager scroll changed.
  - NOTE - you can use this function to create page indicator!
- __pager.removeScrollListener(listener)__ : removes a scroll change listener from pager.
  - listener - function : function to remove from pager.
- __pager.removeAllScrollListener()__ : removes all scroll listeners from pager.
- __pager.setPageTransitionMethod(method)__ : set custom transition method to pager.
  - method - object : object that contains custom transition methods. see below section for more information.

any other functions are internal call only, so DO NOT call them manually.      

#### Properties
you can access these properties to get/set pager data :
- __pager.pageCount__ - readonly number : returns page count of pager.
- __pager.lockPager__ - boolean : true if you want to lock all pager event and changing pages, false otherwise.   

#### Customizing Transition Methods
you can create a new transition method object with constructor.
below code shows the default transition method object.
```javascript
function DefaultPageTransitionMethod(pager){
  var PAGERMEMORY_SCROLL_AMOUNT = 8;

  this.position = function(pageIndex){
    return (pageIndex * (100 / PAGERMEMORY_SCROLL_AMOUNT)) + '%';
  };
  this.scrollPage = function(value) {
    var scrollAmountPerPage = pager.size[0]/PAGERMEMORY_SCROLL_AMOUNT;
    var floatArea = value - parseInt(value);
    if(pager.options.useOverscroll && value < 1){
      return scrollAmountPerPage * (Math.floor(value) + (3 / 4 + floatArea / 4));
    }else if(pager.options.useOverscroll && value > pager.pageCount - 2){
      return scrollAmountPerPage * (Math.floor(value) + 1 / 4 * floatArea);
    }else{
      return scrollAmountPerPage * (Math.floor(value) +
        ((floatArea >= 0.5) ? ((-128) * Math.pow(floatArea - 1, 8) + 1) : 128 * Math.pow(floatArea, 8)));
    }
  };
  this.translatePage = function(value, pageIndex) {
    return '0%';
  }
  this.opacityPage = function(value, pageIndex) {
    if(value >= ((pager.options.useOverscroll) ? 1 : 0) &&
       value <= ((pager.options.useOverscroll) ? pager.pageCount - 2 : pager.pageCount - 1)){
      return Math.max(-2 * Math.abs(value - pageIndex) + 1, 0);
    }
  };
  this.scalePage = function(value){
    return '100%';
  }
}
```
the custom transition method must contains these properties :
- __position__ (pageIndex) : function which returns initial position of each pages. must return a value with unit.
- __scrollPage__ (value) : function which returns scrollLeft value of pager. returned value from this function will sets pager.scrollLeft property. must return a value without unit.
- __translatePage__ (value, pageIndex) : function which returns translateX value of each pages. must return a value with unit.
- __scalePage__ (value, pageIndex) : function which returns scale value of each pages. 1 equals with normal scale.
- __opacityPage__ (value, pageIndex) : function which returns opacity value of each pages. [0, 1] value.

currently, predefined transition methods list is below :
- __DefaultPageTransitionMethod__
- __ZoomOutPageTransitionMethod__
- __DepthPageTransitionMethod__
you can change transition method by using pager.setPageTransitionMethod like below
```javascript
mainPager.setPageTransitionMethod(new ZoomOutPageTransitionMethod(mainPager));
```

#### Other methods
you can get pager object by name like below.
```javascript
var mainPager = pagermemory_getPager('main');
```

### Cautions
you can place and register multiple pager in one html.   
notice that user-select:none css style will neccessary if you support pointer events in desktop platform.   
placing another pager in pager item is ok, but you must disable all pager's pointer events except one pager. If not, multiple pager are effected when one pointer event occur.

## Supported browsers
currently, pager-web-memory only support chrome browser fully.   
other browsers are not tested.
