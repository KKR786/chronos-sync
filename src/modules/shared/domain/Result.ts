/**
 * @license Apache-2.0
 * Functional Result Pattern for Clean Architecture
 */

export class Result<T, E = Error> {
  public isSuccess: boolean;
  public isFailure: boolean;
  private readonly _error?: E;
  private readonly _value?: T;

  private constructor(isSuccess: boolean, error?: E, value?: T) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._error = error;
    this._value = value;
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error("Cannot retrieve the value from a failed Result.");
    }
    return this._value as T;
  }

  public getError(): E {
    if (this.isSuccess) {
      throw new Error("Cannot retrieve the error from a successful Result.");
    }
    return this._error as E;
  }

  public static ok<U>(value?: U): Result<U, never> {
    return new Result<U, never>(true, undefined, value);
  }

  public static fail<F>(error: F): Result<never, F> {
    return new Result<never, F>(false, error);
  }
}
