var pagermemory_pagers = {};
var PAGERMEMORY_PAGE_ANIMATE_DURATION = 350;
var PAGERMEMORY_SCROLL_AMOUNT = 5;

function pagermemory_registerPager(name, pagerElement){
  pagermemory_pagers[name] = {
    name: name,
    object: pagerElement,
    items: [],
    childCount: 0,
    selected: 0,
    animating: false,
    offset: 0,
    size: pagermemory_getSize(pagerElement),
    listener: function() {}
  }
  pagermemory_setup(pagermemory_pagers[name]);
  pagermemory_setPage(pagermemory_pagers[name], 0);
  return pagermemory_pagers[name];
}

function pagermemory_setup(pager){
  pager.object.style.overflow = 'hidden';
  var childs = pager.object.childNodes;
  var childIndex = 0;
  for (var i = 0; i < childs.length; i++) {
    if(childs[i].nodeType != 1) continue;
    each = childs[i];
    each.style.overflowY = 'scroll';
    each.style.position = 'relative';
    each.style.width = '100%';
    each.style.height = '100%';
    each.style.padding = '0';
    each.style.margin = '0';
    each.style.top = (childIndex * -pager.size[1]) + 'px';
    each.style.left = (childIndex * (pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT)) + 'px';
    pager.items.push(each);
    childIndex++;
  }
  pager.pageCount = childIndex;
  pager.object.addEventListener('scroll', function(e){
    var MAX_SCROLL_X = pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * (pager.pageCount - 1);
    for(var itemIndex = 0; itemIndex < pager.pageCount; itemIndex++){
      pager.items[itemIndex].style.opacity = Math.max((-1) * Math.pow(((pager.pageCount - 1) * 2 / MAX_SCROLL_X * pager.object.scrollLeft) - 2 * itemIndex, 2) + 1, 0);
      if(pager.items[itemIndex].style.opacity < 0.5) pager.items[itemIndex].style.pointerEvents = 'none';
      else pager.items[itemIndex].style.pointerEvents = 'all';
    }
  });
}

/** @description Sets pager page without any animations.
 *  @params {object} pager pager object returned by regiesterPager or getPager
 *  @params {number} pageIndex target page index
 */
function pagermemory_setPage(pager, pageIndex){
  for(var childIndex = 0; childIndex < pager.pageCount; childIndex++){
    pager.items[childIndex].style.opacity = (childIndex == pageIndex) ? '1' : '0';
    pager.items[childIndex].style.pointerEvents = (childIndex == pageIndex) ? 'all' : 'none';
  }
  pager.object.scrollLeft = pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * pageIndex;
  pager.selected = pageIndex;
}

function pagermemory_animatePage(pager, pageIndex){
  if(pager.animating) return;
  pager.animating = true;
  pagermemory_animate(pager.offset, pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * pageIndex, 500,
    function(animatedValue){
      pager.object.scrollLeft = animatedValue;
    },
    function(){
      pager.offset = pager.size[0] / PAGERMEMORY_SCROLL_AMOUNT * pageIndex;
      pager.animating = false;
    }
  )
}

function pagermemory_animate(from, to, duration, step, finish){
  var progress = 0;
  var animatedValue = from;
  var DELTA = Math.abs(to - from);
  var DIRECTION = (to - from > 0) ? 1 : -1;
  var STEP_LENGTH_MS = 10;
  var STEP_LENGTH = Math.sqrt(DELTA)/(duration/STEP_LENGTH_MS);
  var animate = function(){
    if(duration == progress * STEP_LENGTH_MS) {
      step(to);
      finish();
      return;
    }
    animatedValue = from + DIRECTION * ((-1) * Math.pow(progress * STEP_LENGTH - Math.sqrt(DELTA), 2) + DELTA);
    step(animatedValue);
    progress++;
    setTimeout(animate, STEP_LENGTH_MS);
  }
  animate();
}

function pagermemory_getSize(element){
  var rect = element.getBoundingClientRect();
  if(rect.width != 0 && rect.height != 0){
    return [rect.width, rect.height];
  } else {
    return [rect.right - rect.left, rect.bottom - rect.top];
  }
}
