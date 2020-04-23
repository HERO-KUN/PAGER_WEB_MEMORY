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
### javascript
register pager and store returned object to control pager like below.   
```
  var options = {useOverscroll: true, usePointerEvent: true};   
  var pager = pagermemory_registerPager('main', document.getElementById('main_pager'), options);
```

pagermemory_registerPager have 3 parameters : identifier, pagerElement, options   
- identifier must be unique between all pagers in html.
- pagerElement is the div element of pager
- options is the option object of pager. currently, 2 options are available for pager-memory : useOverscroll, usePointerEvent
  - useOverscroll is the flag which enables overscroll fling effect
  - usePointerEvent is the flag which enables pointer(mouse, touch) event. if you want to control pager with only script, disable this option.

you can call these functions on returned pager object :   
- pager.selectPage(target, animate) : select given page
  - target - number : target page index. starts at 0.
  - animate - boolean : enables page transition animation when true. false otherwise.
- pager.selectNext(animate) : select next page
  - animate - boolean : enables page transition animation when true. false otherwise.
- pager.selectPrev(animate) : select previous page
  - animate - boolean : enables page transition animation when true. false otherwise.
- pager.getSelectedPageIndex() : get current selected page index. DO NOT use pager.selected because it contains overscroll dummy container as 1 page.

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
