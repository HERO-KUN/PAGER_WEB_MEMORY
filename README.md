# PAGER_WEB_MEMORY
web version of pager - type memory  
contributor : HERO-KUN   
## Intro
Pager is the view which handles paging layouts.   
Inspired by android.support.v4.view.ViewPager, but it is more simillar with Google Play Store mobile application's pager.   
You can add or remove pages dynamically but we recommand to use static layouts to paging.   
You can simply swipe on mobile devices or create tab in desktop platform to change current pages.   

## Changelog
- 2020.04.24 - added lockPager property and scrollListener
- 2020.04.23 - added runtime page add/remove code.
- 2020.04.22 - first version.

## Usage
### html
create pager object and its childs(pages) something like this.

```  
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
register pager and store returned object to control pager like below.   
```
  var options = {useOverscroll: true, usePointerEvent: true};   
  var pager = pagermemory_registerPager('main', document.getElementById('main_pager'), options);
```

pagermemory_registerPager have 3 parameters :
- __identifier__ is the identifier which must be unique between all pagers in html.
- __pagerElement__ is the div element of pager
- __options__ is the option object of pager. currently, 2 options are available for pager-memory : useOverscroll, usePointerEvent
  - __useOverscroll__ is the flag which enables overscroll fling effect
  - __usePointerEvent__ is the flag which enables pointer(mouse, touch) event. if you want to control pager with only script, disable this option.

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

any other functions are internal call only, so DO NOT call them manually.      

you can access these properties to get pager data :
- __pager.pageCount__ - readonly number : returns page count of pager.
- __pager.lockPager__ - boolean : true if you want to lock all pager event and changing pages, false otherwise.

you can set only one pager listener on one pager like below.
- __index__ - number(int) : selected page position
```
  pager.pagerListener = function(index){
    console.log('current selected item : ' + index);
  }
```

you can set only one scroll listener on one pager like below.
- __value__ - number(float) : current scroll value. from 0 to pager.pageCount
```
  pager.scrollListener = function(value){
    console.log('current scroll value : ' + value);
  }
```

you can get pager object by name like below.
```
  var mainPager = pagermemory_getPager('main');
```

placing and registering multiple pager in one html is ok.   
notice that user-select:none css style will neccessary if you support pointer events in desktop platform.

## Supported browsers
currently, pager-web-memory only support chrome browser fully.   
other browsers are not tested.
