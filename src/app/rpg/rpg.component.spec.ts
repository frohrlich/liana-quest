import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RpgComponent } from './rpg.component';

describe('RpgComponent', () => {
  let component: RpgComponent;
  let fixture: ComponentFixture<RpgComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RpgComponent]
    });
    fixture = TestBed.createComponent(RpgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
