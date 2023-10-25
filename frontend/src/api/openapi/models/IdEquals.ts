/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * Helper class that provides a standard way to create an ABC using
 * inheritance.
 */
export type IdEquals = {
  discriminator: IdEquals.discriminator;
  value: number;
};

export namespace IdEquals {
  export enum discriminator {
    ID_EQUALS = "id_equals",
  }
}
