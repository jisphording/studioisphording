/**
    * Normalize a value between two bounds
    *
    * @param  { number } min Minimum boundary
    * @param  { number } max Maximum boundary
    * @param  { number } value   Value to normalize
    * @return { number }     Normalized value
    */
export function normalize( min, max, value ) {
    return ( value - min ) / ( max - min );
}