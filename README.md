# PAGER_WEB_MEMORY
web version of pager - type memory  
contributor : HERO-KUN

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

pagermemory_registerPager have 3 parameters : identifier, pagerElement, options   
- __identifier__ must be unique between all pagers in html.
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

you can set only one pager listener on one pager like below.
```
  pager.listener = function(index){
    console.log('current selected item : ' + index);
  }
```

you can get pager object by name like below.
```
  var mainPager = pagermemory_getPager('main');
```

placing and registering multiple pager in one html is ok.   
notice that user-select:none css style will neccessary if you support pointer events in desktop platform.
