# PAGER - web_memory
## Intro
Pager is the view which handles paging layouts.   
Inspired by android.support.v4.view.ViewPager, but it is more similar with Google Play Store mobile application's pager.   
You can add or remove pages dynamically, but we recommend to use static layouts to paging.   
You can simply swipe on mobile devices or create a tab on a desktop platform to change current pages.   

## Changelog
- 2020.08.27
  - added jsdoc comments. this will useful if you are using intellij idea.
  - combine all listener codes. pass listener type to addListener, removeListener, removeAllListener to control listeners. 
- 2020.05.23
  - removed getPager function and pager name parameter in Pager constructor.
  - added pager_tab_memory script. you can use this script to create some tabs!
  - fixed bugs related with positioning after add/remove pages.
- 2020.05.18
  - removed old registerPager function and added constructor of Pager.
- 2020.04.26
  - new pager option : type! you can set pager orientation to vertical if you want, default if horizontal!
  - changed : PageTransitionMethod no more needs pager object to create object. it automatically sets its pager.
  - fixed : some minor bugs related page delaying
- 2020.04.25
  - new features : PageTransitionMethod! you can now customize page transition animation as you want!
  - you can now use multiple listeners on one pager
  - pageListener behaviour changed, now triggers only when page index changed
- 2020.04.24
  - added lockPager property and scrollListener
- 2020.04.23
  - added runtime page add/remove code
- 2020.04.22
  - first version

## Usage
### html
create pager object and its children(pages) something like this.

```html
<div id="main_pager" style="width: 100%; height: 50%;">   
  <div data-pagermemory-title="Title 0">Page0 - Some Content here</div>   
  <div data-pagermemory-title="Title 1">Page1 - Some Content here</div>   
  <div data-pagermemory-title="Title 2">Page2 - Some Content here</div>   
  <div data-pagermemory-title="Title 3">Page3 - Some Content here</div>   
</div>   
```

notice that pager object must have its own width and height like % or px etc.   
pager items(pages) can have its child elements like div, span, etc. so fill the child div of pager as you want.   
### javascript
#### Creating Pager Object
create pager object and store returned object to control pager like below.   
```javascript
let options = {useOverscroll: true, usePointerEvent: true};   
let pager = new Pager(document.getElementById('main_pager'), options);
```

Pager constructor have 2 parameters :
- __pagerElement__ is the div element of pager
- __options__ is the option object of pager. currently, 2 options are available for pager-memory : useOverscroll, usePointerEvent
  - __useOverscroll__ is the flag which enables overscroll fling effect
  - __usePointerEvent__ is the flag which enables pointer(mouse, touch) event. if you want to control pager with only script, disable this option.
  - __type__ is the flag which defines the type of the pager. if this option is not defined, default is 'horizontal'. you can set this option 'vertical' if this pager scrolls vertically.

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
- __pager.getPageTitle(index)__ : get page title which is defined in html pagermemory_title attribute.
  - index - number : position of page title.
- __pager.addPage(position, element)__ : inserts a page before given position
  - position - number : position where insert to
  - element - element : page element. this must be div element.
- __pager.removePage(position)__ : removes a given position's page
  - position - number : position where remove to
  - NOTE : pager must have at least 1 page. if you try to remove last one page, error will occur.
- __pager.addListener(type, listener)__ : adds a page change listener to pager.
  - type - number : one of these values in pager object -> LISTENER_TYPE_PAGE, LISTENER_TYPE_PAGE_SET, LISTENER_TYPE_SCROLL
  - listener - function : function to execute when page changed.
- __pager.removeListener(type, listener)__ : removes a page change listener from pager.
  - type - number : same as addListener's type.
  - listener - function : function to remove from pager.
- __pager.removeAllListener(type)__ : removes all page listeners from pager.
  - type - number : same as addListener's type.
- __pager.setPageTransitionMethod(method)__ : set custom transition method to pager.
  - method - object : object that contains custom transition methods. see below section for more information.

any other functions are internal call only, so DO NOT call them manually.      

#### Properties
you can access these properties to get/set pager data :
- __pager.size__ - readonly number array : first item is width, second item is height. with pixels.
- __pager.options__ - readonly object : contains options which set when creating Pager object.
- __pager.pageCount__ - readonly number : returns page count of pager.
- __pager.lockPager__ - boolean : true if you want to lock all pager event and changing pages, false otherwise.   

#### Customizing Transition Methods
you can set custom transition method object to pager.
below code shows the zoom out transition method object.
```javascript
function ZoomOutPageTransitionMethod(){
  this.position = function(pageIndex) {
    return (pageIndex * 100) + '%';
  };
  this.scrollPage = function(value){
    var positionIndex = (this.pager.options.type == 'vertical') ? 1 : 0;
    var floatArea = value - parseInt(value);
    if(this.pager.options.useOverscroll && value < 1){
      return this.pager.size[positionIndex] * (Math.floor(value) + (3 / 4 + floatArea / 4));
    }else if(this.pager.options.useOverscroll && value > this.pager.pageCount - 2){
      return this.pager.size[positionIndex] * (Math.floor(value) + 1 / 4 * floatArea);
    }else{
      return this.pager.size[positionIndex] * (Math.floor(value) +
        ((floatArea >= 0.5) ? ((-8) * Math.pow(floatArea - 1, 4) + 1) : 8 * Math.pow(floatArea, 4)));
    }
  };
  this.translatePage = function(value, pageIndex) {
    return '0%';
  }
  this.scalePage = function(value, pageIndex){
    var floatArea = value - Math.floor(value);
    if(floatArea < 0.2){
      return 1 - floatArea/4;
    }else if(floatArea < 0.8){
      return 0.95;
    }else{
      return 0.95 + (floatArea - 0.8)/4;
    }
  }
  this.opacityPage = function(value, pageIndex){
    var floatArea = value - Math.floor(value);
    if(floatArea < 0.3){
      return 1 - floatArea * 1.5;
    }else if(floatArea < 0.7){
      return 0.55;
    }else{
      return 0.55 + (floatArea - 0.7) * 1.5;
    }
  };
}
```
the custom transition method must contain these properties :
- __position__ (pageIndex) : function which returns initial position of each pages. must return a value with unit.
- __scrollPage__ (value) : function which returns scrollLeft value of pager. returned value from this function will sets pager.scrollLeft property. must return a value without unit.
- __translatePage__ (value, pageIndex) : function which returns translateX value of each pages. must return a value with unit.
- __scalePage__ (value, pageIndex) : function which returns scale value of each pages. 1 equals with normal scale.
- __opacityPage__ (value, pageIndex) : function which returns opacity value of each pages. [0, 1] value.

you can change transition method by using pager.setPageTransitionMethod like below
```javascript
mainPager.setPageTransitionMethod(new ZoomOutPageTransitionMethod());
```

## Pager Tab Usage
you can create your own tabs, but here is some simple tabs pre-defined!   
if you are creating same tab objects to each page, using this one may be ok.

### html
```html
<div id="main_pager_tab">
  <div class="pagermemory_tab_object some_other_css_classes">
    <div class="some_css_classes"><!-- normal tab -->
      <div class="pagermemory_tab_title some_other_normal_tab_css_classes"></div>
    </div>
    <div class="some_css_classes"><!-- selected tab -->
      <div class="pagermemory_tab_title some_other_selected_tab_css_classes"></div>
    </div>
  </div>
</div>
```
default form of pager tab is like this. you can customize tab style of normal tab(some_other_normal_tab_css_classes) and selected tab(some_other_selected_tab_css_classes).   
script will duplicate pagermemory_tab_object div and position those divs horizontally.   
normal tab will display only that tab is not selected, and selected tab will display only when that tab is selected.   

### javascript
```javascript
var mainPagerTab = new PagerTab(document.getElementById('main_pager_tab'), mainPager);
```
notice that this tab must needs Pager object! you can attach the tab to mainPager using above code.


## Cautions
- you can place and create multiple pager object in one html.   
- notice that user-select:none css style will necessary if you support pointer events in desktop platform.   
- placing another pager in pager item is ok, but you must disable all pager's pointer events except one pager. If not, multiple pager are effected when one pointer event.

## Supported browsers
currently, pager-web-memory only support chrome browser fully.   
other browsers aren't tested.
