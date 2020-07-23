from PIL import Image

def resize_picture(instance, size): # size = max x or y
    width = instance.width
    height = instance.height
    fullname = instance.path
    max_size = max(width, height)
    min_size = min(width, height)
    image = Image.open(fullname)
    if max_size > size:
        left = (width - min_size) // 2
        upper = (height - min_size) // 2
        image = image.crop((left, upper, left + min_size, upper + min_size))
        image = image.resize((size, size), Image.ANTIALIAS)
    image.save(fullname)