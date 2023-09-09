import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MonRpgComponent } from './mon-rpg.component';

describe('MonRpgComponent', () => {
  let component: MonRpgComponent;
  let fixture: ComponentFixture<MonRpgComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MonRpgComponent]
    });
    fixture = TestBed.createComponent(MonRpgComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
