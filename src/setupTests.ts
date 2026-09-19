import '@testing-library/jest-dom';
import { mockWindowApi } from './testUtils';

if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function() {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function() {
    this.open = false;
  };
}

if (typeof window !== 'undefined') {
  window.confirm = () => true;
}

beforeAll(() => {
  mockWindowApi();
});
