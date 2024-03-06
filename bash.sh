for dockerfile in $(find . -name Dockerfile); do
    dir_of_image=$(dirname $dockerfile)
    image_name=$(basename $dir_of_image)
    image_name=${image_name//\//-}
    echo "Building $image_name"
done