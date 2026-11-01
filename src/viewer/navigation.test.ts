import { expect, it } from 'vitest';
import { focusElement } from './navigation';
it('centers a distant element and restores readable scale after Fit', () => {
  expect(focusElement({width:800,height:600},{width:2000,height:12000},{x:500,y:9000,width:200,height:80},0.1)).toEqual({zoom:1,left:200,top:8740});
});
it('preserves useful zoom and clamps scrolling at both diagram edges', () => {
  expect(focusElement({width:800,height:600},{width:2000,height:12000},{x:1900,y:11900,width:100,height:100},2)).toEqual({zoom:2,left:3200,top:23400});
  expect(focusElement({width:800,height:600},{width:200,height:100},{x:0,y:0,width:100,height:50},1)).toEqual({zoom:1,left:0,top:0});
});
